from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from accounts.models import FamilyMember
from vaccines.models import Vaccine, VaccinationSchedule
from checkups.models import Checkup, CheckupRecord
from appointments.models import Appointment
from .models import Baby
from .serializers import BabySerializer, BabyListSerializer


def _calculate_age_months(birth_date, today=None):
    if today is None:
        today = date.today()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        months -= 1
    return max(0, months)


class BabyViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'list':
            return BabyListSerializer
        return BabySerializer

    def get_queryset(self):
        if self.request.user.is_authenticated:
            family_ids = FamilyMember.objects.filter(user=self.request.user).values_list('family_id', flat=True)
            return Baby.objects.filter(family_id__in=family_ids)
        return Baby.objects.all()

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            family_member = FamilyMember.objects.filter(user=self.request.user).first()
            family = family_member.family if family_member else None
            serializer.save(family=family)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def generate_schedule(self, request, pk=None):
        baby = self.get_object()
        vaccines = Vaccine.objects.all()
        created = []
        for vaccine in vaccines:
            planned_date = baby.birth_date + relativedelta(months=vaccine.applicable_age_months)
            exists = VaccinationSchedule.objects.filter(baby=baby, vaccine=vaccine).exists()
            if not exists:
                schedule = VaccinationSchedule.objects.create(
                    baby=baby,
                    vaccine=vaccine,
                    planned_date=planned_date,
                    status='pending',
                )
                created.append(schedule.id)
        return Response({'created_schedules': len(created)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def task_flow(self, request, pk=None):
        baby = self.get_object()
        today = date.today()
        current_age_months = _calculate_age_months(baby.birth_date, today)
        target_month = request.query_params.get('month')
        if target_month is not None:
            try:
                target_month = int(target_month)
            except (ValueError, TypeError):
                target_month = current_age_months
        else:
            target_month = current_age_months

        month_start_date = baby.birth_date + relativedelta(months=target_month)
        month_end_date = baby.birth_date + relativedelta(months=target_month + 1)

        vaccine_schedules = VaccinationSchedule.objects.filter(
            baby=baby,
            vaccine__applicable_age_months=target_month,
        ).select_related('vaccine')

        checkups = Checkup.objects.filter(applicable_age_months=target_month)
        checkup_records = CheckupRecord.objects.filter(
            baby=baby,
            checkup_date__gte=month_start_date,
            checkup_date__lt=month_end_date,
        ).select_related('checkup')

        appointments = Appointment.objects.filter(
            baby=baby,
            appointment_date__gte=month_start_date,
            appointment_date__lt=month_end_date,
        ).select_related('vaccine', 'reminded_by')

        tasks = []
        task_id_counter = 1

        for schedule in vaccine_schedules:
            vaccine = schedule.vaccine
            related_appointment = appointments.filter(
                appointment_type='vaccine',
                vaccine=vaccine,
            ).first()
            overdue = schedule.status == 'pending' and schedule.planned_date < today
            tasks.append({
                'task_id': f'v_{schedule.id}',
                'task_type': 'vaccine',
                'task_type_label': '疫苗接种',
                'title': f'{vaccine.short_name} 第{vaccine.dose_number}剂',
                'full_name': vaccine.name,
                'planned_date': str(schedule.planned_date),
                'schedule_status': schedule.status,
                'schedule_status_label': schedule.get_status_display(),
                'overdue': overdue,
                'actual_date': str(schedule.actual_date) if schedule.actual_date else None,
                'vaccination_site': schedule.vaccination_site or None,
                'vaccine_type': vaccine.vaccine_type,
                'vaccine_type_label': vaccine.get_vaccine_type_display(),
                'route': vaccine.get_route_display(),
                'precautions': vaccine.precautions or None,
                'related_schedule_id': schedule.id,
                'vaccine_id': vaccine.id,
                'appointment': {
                    'id': related_appointment.id if related_appointment else None,
                    'status': related_appointment.status if related_appointment else None,
                    'status_label': related_appointment.get_status_display() if related_appointment else None,
                    'appointment_date': str(related_appointment.appointment_date) if related_appointment else None,
                    'time_slot': related_appointment.time_slot if related_appointment else None,
                    'time_slot_label': related_appointment.get_time_slot_display() if related_appointment else None,
                    'hospital': related_appointment.hospital if related_appointment else None,
                    'reminded_by_id': related_appointment.reminded_by_id if related_appointment else None,
                    'reminded_by_name': related_appointment.reminded_by.username if related_appointment and related_appointment.reminded_by else None,
                    'reminded_at': str(related_appointment.reminded_at) if related_appointment and related_appointment.reminded_at else None,
                } if related_appointment else None,
                'flow_status': (
                    'completed' if schedule.status == 'completed' else
                    'appointment_confirmed' if related_appointment and related_appointment.status == 'confirmed' else
                    'appointment_pending' if related_appointment and related_appointment.status == 'pending' else
                    'reminded' if related_appointment and related_appointment.reminded_at else
                    'need_action'
                ),
            })

        checkup_ids_for_month = checkups.values_list('id', flat=True)
        for checkup in checkups:
            record = checkup_records.filter(checkup=checkup).first()
            related_appointment = appointments.filter(
                appointment_type='checkup',
                checkup_type__icontains=checkup.name,
            ).first()
            tasks.append({
                'task_id': f'c_{checkup.id}',
                'task_type': 'checkup',
                'task_type_label': '体检',
                'title': checkup.name,
                'checkup_items': checkup.checkup_items or [],
                'record': {
                    'id': record.id if record else None,
                    'checkup_date': str(record.checkup_date) if record else None,
                    'height': str(record.height) if record and record.height else None,
                    'weight': str(record.weight) if record and record.weight else None,
                    'head_circumference': str(record.head_circumference) if record and record.head_circumference else None,
                    'doctor_advice': record.doctor_advice if record else None,
                    'next_visit_date': str(record.next_visit_date) if record and record.next_visit_date else None,
                } if record else None,
                'related_checkup_id': checkup.id,
                'appointment': {
                    'id': related_appointment.id if related_appointment else None,
                    'status': related_appointment.status if related_appointment else None,
                    'status_label': related_appointment.get_status_display() if related_appointment else None,
                    'appointment_date': str(related_appointment.appointment_date) if related_appointment else None,
                    'time_slot': related_appointment.time_slot if related_appointment else None,
                    'time_slot_label': related_appointment.get_time_slot_display() if related_appointment else None,
                    'hospital': related_appointment.hospital if related_appointment else None,
                    'reminded_by_id': related_appointment.reminded_by_id if related_appointment else None,
                    'reminded_by_name': related_appointment.reminded_by.username if related_appointment and related_appointment.reminded_by else None,
                    'reminded_at': str(related_appointment.reminded_at) if related_appointment and related_appointment.reminded_at else None,
                } if related_appointment else None,
                'flow_status': (
                    'completed' if record else
                    'appointment_confirmed' if related_appointment and related_appointment.status == 'confirmed' else
                    'appointment_pending' if related_appointment and related_appointment.status == 'pending' else
                    'reminded' if related_appointment and related_appointment.reminded_at else
                    'need_action'
                ),
            })

        stats = {
            'total_tasks': len(tasks),
            'completed_tasks': len([t for t in tasks if t['flow_status'] == 'completed']),
            'appointment_tasks': len([t for t in tasks if t['appointment']]),
            'reminded_tasks': len([t for t in tasks if t['appointment'] and t['appointment'].get('reminded_at')]),
            'need_action_tasks': len([t for t in tasks if t['flow_status'] == 'need_action']),
            'overdue_tasks': len([t for t in tasks if t.get('overdue')]),
        }
        stats['completion_rate'] = round(stats['completed_tasks'] / stats['total_tasks'], 4) if stats['total_tasks'] > 0 else 0
        stats['appointment_rate'] = round(stats['appointment_tasks'] / max(stats['total_tasks'] - stats['completed_tasks'], 1), 4) if stats['total_tasks'] > stats['completed_tasks'] else 0

        family_member_count = 0
        reminded_member_ids = set()
        if baby.family_id:
            family_member_count = FamilyMember.objects.filter(family_id=baby.family_id).count()
            reminded_user_ids = [
                t['appointment']['reminded_by_id']
                for t in tasks
                if t['appointment'] and t['appointment'].get('reminded_by_id')
            ]
            reminded_member_ids = set(reminded_user_ids)

        months_available = list(range(current_age_months + 1))

        return Response({
            'baby_id': baby.id,
            'baby_name': baby.name,
            'current_age_months': current_age_months,
            'target_month': target_month,
            'is_current_month': target_month == current_age_months,
            'month_start_date': str(month_start_date),
            'tasks': tasks,
            'stats': stats,
            'family': {
                'family_id': baby.family_id,
                'total_members': family_member_count,
                'reminded_members_count': len(reminded_member_ids),
                'reminder_coverage': round(len(reminded_member_ids) / family_member_count, 4) if family_member_count > 0 else 0,
            },
            'months_available': months_available,
        })
