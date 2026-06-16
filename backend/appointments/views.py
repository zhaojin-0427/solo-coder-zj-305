from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Appointment
from .serializers import AppointmentSerializer
from babies.models import Baby
from vaccines.models import Vaccine, VaccinationSchedule
from checkups.models import Checkup, CheckupRecord


def _calculate_age_months(birth_date, today=None):
    if today is None:
        today = date.today()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        months -= 1
    return max(0, months)


TIME_SLOT_ORDER = {
    'morning_1': 1, 'morning_2': 2, 'morning_3': 3,
    'afternoon_1': 4, 'afternoon_2': 5, 'afternoon_3': 6,
}


def _detect_conflicts(baby_id, appointment_date, time_slot, exclude_id=None):
    conflicts = []
    qs = Appointment.objects.filter(
        baby_id=baby_id,
        appointment_date=appointment_date,
    ).exclude(status='cancelled')
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    same_slot = qs.filter(time_slot=time_slot).first()
    if same_slot:
        conflicts.append({
            'type': 'time_slot_conflict',
            'severity': 'error',
            'message': f'该宝宝在 {appointment_date} 同一时段({same_slot.get_time_slot_display()})已有预约：{same_slot.get_appointment_type_display()}' + (f' - {same_slot.vaccine.short_name}' if same_slot.vaccine else (f' - {same_slot.checkup_type}' if same_slot.checkup_type else '')),
            'existing_appointment_id': same_slot.id,
        })
    same_day = qs.exclude(time_slot=time_slot)
    if same_day.exists():
        for apt in same_day:
            slot_diff = abs(TIME_SLOT_ORDER.get(time_slot, 0) - TIME_SLOT_ORDER.get(apt.time_slot, 0))
            if slot_diff <= 1:
                conflicts.append({
                    'type': 'same_day_close',
                    'severity': 'warning',
                    'message': f'该宝宝在 {appointment_date} {apt.get_time_slot_display()} 还有一个{apt.get_appointment_type_display()}预约，两个预约时间较近，请注意安排。',
                    'existing_appointment_id': apt.id,
                })
    return conflicts


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related('baby', 'vaccine', 'reminded_by').all()
    serializer_class = AppointmentSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby', 'status', 'appointment_type']

    def create(self, request, *args, **kwargs):
        baby_id = request.data.get('baby')
        appointment_date = request.data.get('appointment_date')
        time_slot = request.data.get('time_slot')
        force = request.data.get('force', False)
        if baby_id and appointment_date and time_slot:
            conflicts = _detect_conflicts(baby_id, appointment_date, time_slot)
            hard_conflicts = [c for c in conflicts if c['severity'] == 'error']
            if hard_conflicts and not force:
                return Response(
                    {
                        'detail': '检测到预约冲突',
                        'conflicts': conflicts,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        response = super().create(request, *args, **kwargs)
        if response.status_code in (200, 201):
            conflicts = _detect_conflicts(baby_id, appointment_date, time_slot, exclude_id=response.data.get('id'))
            warnings = [c for c in conflicts if c['severity'] == 'warning']
            if warnings:
                response.data['warnings'] = warnings
        return response

    @action(detail=True, methods=['post'])
    def mark_reminded(self, request, pk=None):
        appointment = self.get_object()
        appointment.reminded_by = request.user if request.user.is_authenticated else None
        appointment.reminded_at = datetime.now()
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unmark_reminded(self, request, pk=None):
        appointment = self.get_object()
        appointment.reminded_by = None
        appointment.reminded_at = None
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def smart_recommend(self, request):
        baby_id = request.query_params.get('baby_id')
        appointment_type = request.query_params.get('appointment_type')
        if not baby_id:
            return Response({'detail': '请指定宝宝'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            baby = Baby.objects.get(pk=baby_id)
        except Baby.DoesNotExist:
            return Response({'detail': '未找到宝宝'}, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        current_age = _calculate_age_months(baby.birth_date, today)
        recommendations = []
        pending_tasks = []

        if appointment_type in (None, 'vaccine'):
            schedules = VaccinationSchedule.objects.filter(
                baby=baby,
                status='pending',
            ).select_related('vaccine').order_by('planned_date')
            for schedule in schedules:
                existing_apt = Appointment.objects.filter(
                    baby=baby,
                    appointment_type='vaccine',
                    vaccine=schedule.vaccine,
                ).exclude(status='cancelled').first()
                if not existing_apt:
                    is_overdue = schedule.planned_date < today
                    priority_score = 100 if is_overdue else max(0, 60 - (schedule.planned_date - today).days)
                    pending_tasks.append({
                        'task_type': 'vaccine',
                        'vaccine_id': schedule.vaccine.id,
                        'vaccine_name': schedule.vaccine.name,
                        'vaccine_short_name': schedule.vaccine.short_name,
                        'dose_number': schedule.vaccine.dose_number,
                        'planned_date': str(schedule.planned_date),
                        'applicable_age_months': schedule.vaccine.applicable_age_months,
                        'is_overdue': is_overdue,
                        'priority_score': priority_score,
                        'recommend_hospital': baby.hospital_preference or None,
                    })

        if appointment_type in (None, 'checkup'):
            checkups = Checkup.objects.filter(
                applicable_age_months__lte=current_age + 1,
            ).order_by('applicable_age_months')
            for checkup in checkups:
                planned_date = baby.birth_date + relativedelta(months=checkup.applicable_age_months)
                existing_record = CheckupRecord.objects.filter(
                    baby=baby,
                    checkup=checkup,
                ).first()
                existing_apt = Appointment.objects.filter(
                    baby=baby,
                    appointment_type='checkup',
                    checkup_type__icontains=checkup.name,
                ).exclude(status='cancelled').first()
                if not existing_record and not existing_apt:
                    is_overdue = planned_date < today
                    priority_score = 100 if is_overdue else max(0, 60 - (planned_date - today).days)
                    pending_tasks.append({
                        'task_type': 'checkup',
                        'checkup_id': checkup.id,
                        'checkup_name': checkup.name,
                        'checkup_items': checkup.checkup_items or [],
                        'planned_date': str(planned_date),
                        'applicable_age_months': checkup.applicable_age_months,
                        'is_overdue': is_overdue,
                        'priority_score': priority_score,
                        'recommend_hospital': baby.hospital_preference or None,
                    })

        pending_tasks.sort(key=lambda x: -x['priority_score'])

        existing_appointments = Appointment.objects.filter(
            baby=baby,
        ).exclude(status='cancelled').values_list('appointment_date', 'time_slot')
        occupied = set(existing_appointments)
        recommend_dates = []
        for days_offset in range(1, 22):
            candidate_date = today + timedelta(days=days_offset)
            if candidate_date.weekday() >= 5:
                continue
            available_slots = []
            for slot in TIME_SLOT_ORDER.keys():
                if (candidate_date, slot) not in occupied:
                    available_slots.append({
                        'time_slot': slot,
                        'time_slot_label': dict(Appointment.TIME_SLOT_CHOICES).get(slot, slot),
                    })
            if available_slots:
                recommend_dates.append({
                    'date': str(candidate_date),
                    'weekday': candidate_date.strftime('%A'),
                    'available_slots': available_slots,
                })
            if len(recommend_dates) >= 5:
                break

        near_family_conflicts = []
        if baby.family_id:
            from accounts.models import FamilyMember
            sibling_ids = Baby.objects.filter(family_id=baby.family_id).exclude(pk=baby.id).values_list('pk', flat=True)
            if sibling_ids:
                sibling_apt_dates = Appointment.objects.filter(
                    baby_id__in=sibling_ids,
                    appointment_date__gte=today,
                    appointment_date__lte=today + timedelta(days=30),
                ).exclude(status='cancelled').values('appointment_date', 'time_slot', 'baby__name', 'appointment_type', 'vaccine__short_name', 'checkup_type')
                for apt in sibling_apt_dates:
                    near_family_conflicts.append({
                        'date': str(apt['appointment_date']),
                        'time_slot': apt['time_slot'],
                        'baby_name': apt['baby__name'],
                        'type': apt['appointment_type'],
                        'detail': apt['vaccine__short_name'] or apt['checkup_type'] or '',
                    })

        return Response({
            'baby_id': baby.id,
            'baby_name': baby.name,
            'current_age_months': current_age,
            'pending_tasks': pending_tasks[:10],
            'recommend_dates': recommend_dates,
            'near_family_conflicts': near_family_conflicts,
            'default_hospital': baby.hospital_preference or None,
        })
