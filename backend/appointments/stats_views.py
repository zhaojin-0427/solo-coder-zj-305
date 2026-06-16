from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from collections import defaultdict
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from vaccines.models import Vaccine, VaccinationSchedule
from appointments.models import Appointment
from reactions.models import Reaction
from checkups.models import CheckupRecord, Checkup
from babies.models import Baby
from accounts.models import Family, FamilyMember

AGE_STAGES = [
    ('0-6月', 0, 6),
    ('6-12月', 6, 12),
    ('12-18月', 12, 18),
    ('18-24月', 18, 24),
    ('24-36月', 24, 36),
    ('36月+', 36, 999),
]


def _calculate_age_months(birth_date, today=None):
    if today is None:
        today = date.today()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        months -= 1
    return max(0, months)


class StatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        appointments_qs = Appointment.objects.all()
        schedules_qs = VaccinationSchedule.objects.all()
        reactions_qs = Reaction.objects.all()

        if baby_id:
            appointments_qs = appointments_qs.filter(baby_id=baby_id)
            schedules_qs = schedules_qs.filter(baby_id=baby_id)
            reactions_qs = reactions_qs.filter(appointment__baby_id=baby_id)

        data = {
            'total_babies': Baby.objects.count() if not baby_id else 1,
            'total_appointments': appointments_qs.count(),
            'completed_appointments': appointments_qs.filter(status='completed').count(),
            'pending_appointments': appointments_qs.filter(status='pending').count(),
            'total_vaccinations': schedules_qs.count(),
            'completed_vaccinations': schedules_qs.filter(status='completed').count(),
            'delayed_vaccinations': schedules_qs.filter(status='delayed').count(),
            'total_reactions': reactions_qs.count(),
        }
        return Response(data)


class VaccinationRateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        schedules_qs = VaccinationSchedule.objects.select_related('vaccine')

        if baby_id:
            schedules_qs = schedules_qs.filter(baby_id=baby_id)

        result = []
        for stage_name, min_month, max_month in AGE_STAGES:
            stage_schedules = schedules_qs.filter(
                vaccine__applicable_age_months__gte=min_month,
                vaccine__applicable_age_months__lt=max_month,
            )
            total = stage_schedules.count()
            completed = stage_schedules.filter(status='completed').count()
            rate = round(completed / total, 4) if total > 0 else 0
            result.append({
                'stage_name': stage_name,
                'total': total,
                'completed': completed,
                'rate': rate,
            })
        return Response(result)


class DelayCountView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        today = date.today()

        if baby_id:
            delayed_schedules = VaccinationSchedule.objects.filter(
                baby_id=baby_id,
                status='delayed',
            ).select_related('vaccine')
            details = []
            for schedule in delayed_schedules:
                delay_days = (today - schedule.planned_date).days if schedule.planned_date < today else 0
                details.append({
                    'vaccine_name': schedule.vaccine.name,
                    'planned_date': schedule.planned_date,
                    'delay_days': delay_days,
                })
            return Response({
                'baby_id': baby_id,
                'delay_count': delayed_schedules.count(),
                'details': details,
            })

        babies = Baby.objects.all()
        result = []
        for baby in babies:
            delay_count = baby.vaccination_schedules.filter(status='delayed').count()
            result.append({
                'baby_id': baby.id,
                'baby_name': baby.name,
                'delay_count': delay_count,
            })
        return Response(result)


class ReactionDistributionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        reactions_qs = Reaction.objects.all()

        if baby_id:
            reactions_qs = reactions_qs.filter(appointment__baby_id=baby_id)

        by_type = {}
        by_severity = {}
        for reaction in reactions_qs:
            rtype = reaction.reaction_type
            severity = reaction.severity
            by_type[rtype] = by_type.get(rtype, 0) + 1
            by_severity[severity] = by_severity.get(severity, 0) + 1

        data = {
            'by_type': [{'type': k, 'count': v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])],
            'by_severity': [{'severity': k, 'count': v} for k, v in sorted(by_severity.items(), key=lambda x: -x[1])],
        }
        return Response(data)


class MonthlyProgressView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        if not baby_id:
            return Response([])

        try:
            baby = Baby.objects.get(pk=baby_id)
        except Baby.DoesNotExist:
            return Response([])

        today = date.today()
        age_months = (today.year - baby.birth_date.year) * 12 + (today.month - baby.birth_date.month)
        if today.day < baby.birth_date.day:
            age_months -= 1
        if age_months < 0:
            age_months = 0

        result = []
        for month in range(age_months + 1):
            schedules = VaccinationSchedule.objects.filter(
                baby=baby,
                vaccine__applicable_age_months=month,
            )
            total_vaccines = schedules.count()
            completed_vaccines = schedules.filter(status='completed').count()

            checkups = Checkup.objects.filter(applicable_age_months=month)
            total_checkups = checkups.count()
            completed_checkups = CheckupRecord.objects.filter(
                baby=baby,
                checkup__applicable_age_months=month,
            ).count()

            result.append({
                'month': month,
                'total_vaccines': total_vaccines,
                'completed_vaccines': completed_vaccines,
                'total_checkups': total_checkups,
                'completed_checkups': completed_checkups,
            })
        return Response(result)


class CollaborationStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')
        today = date.today()

        babies_qs = Baby.objects.all()
        if baby_id:
            babies_qs = babies_qs.filter(pk=baby_id)
        elif family_id:
            babies_qs = babies_qs.filter(family_id=family_id)

        total_babies = babies_qs.count()
        if total_babies == 0:
            return Response({'detail': '无数据'}, status=404)

        total_vaccine_tasks = 0
        completed_vaccine_tasks = 0
        total_checkup_tasks = 0
        completed_checkup_tasks = 0
        vaccine_with_appointment = 0
        checkup_with_appointment = 0
        overdue_tasks = 0

        all_pending_tasks_with_appointment = 0
        all_pending_tasks_reminded = 0

        for baby in babies_qs:
            age_months = _calculate_age_months(baby.birth_date, today)
            max_month = min(age_months, 36)

            for month in range(max_month + 1):
                vaccine_schedules = VaccinationSchedule.objects.filter(
                    baby=baby,
                    vaccine__applicable_age_months=month,
                )
                for vs in vaccine_schedules:
                    total_vaccine_tasks += 1
                    if vs.status == 'completed':
                        completed_vaccine_tasks += 1
                    elif vs.status == 'pending':
                        has_apt = Appointment.objects.filter(
                            baby=baby,
                            appointment_type='vaccine',
                            vaccine=vs.vaccine,
                        ).exclude(status='cancelled').exists()
                        if has_apt:
                            vaccine_with_appointment += 1
                            all_pending_tasks_with_appointment += 1
                            reminded_apt = Appointment.objects.filter(
                                baby=baby,
                                appointment_type='vaccine',
                                vaccine=vs.vaccine,
                                reminded_at__isnull=False,
                            ).exclude(status='cancelled').exists()
                            if reminded_apt:
                                all_pending_tasks_reminded += 1
                        if vs.planned_date < today:
                            overdue_tasks += 1

                checkups_for_month = Checkup.objects.filter(applicable_age_months=month)
                for cu in checkups_for_month:
                    total_checkup_tasks += 1
                    month_start = baby.birth_date + relativedelta(months=month)
                    month_end = baby.birth_date + relativedelta(months=month + 1)
                    record = CheckupRecord.objects.filter(
                        baby=baby,
                        checkup=cu,
                        checkup_date__gte=month_start,
                        checkup_date__lt=month_end,
                    ).first()
                    if record:
                        completed_checkup_tasks += 1
                    else:
                        has_apt = Appointment.objects.filter(
                            baby=baby,
                            appointment_type='checkup',
                            checkup_type__icontains=cu.name,
                            appointment_date__gte=month_start,
                            appointment_date__lt=month_end + relativedelta(months=1),
                        ).exclude(status='cancelled').exists()
                        if has_apt:
                            checkup_with_appointment += 1
                            all_pending_tasks_with_appointment += 1
                            reminded_apt = Appointment.objects.filter(
                                baby=baby,
                                appointment_type='checkup',
                                checkup_type__icontains=cu.name,
                                reminded_at__isnull=False,
                            ).exclude(status='cancelled').exists()
                            if reminded_apt:
                                all_pending_tasks_reminded += 1
                        if month_end < today:
                            overdue_tasks += 1

        total_tasks = total_vaccine_tasks + total_checkup_tasks
        total_completed = completed_vaccine_tasks + completed_checkup_tasks
        total_pending = total_tasks - total_completed
        total_with_appointment = vaccine_with_appointment + checkup_with_appointment

        completion_rate = round(total_completed / total_tasks, 4) if total_tasks > 0 else 0
        appointment_conversion_rate = round(total_with_appointment / max(total_pending, 1), 4) if total_pending > 0 else 0
        reminder_coverage_rate = round(all_pending_tasks_reminded / max(all_pending_tasks_with_appointment, 1), 4) if all_pending_tasks_with_appointment > 0 else 0

        appointment_stats_qs = Appointment.objects.filter(baby__in=babies_qs)
        total_appointments = appointment_stats_qs.count()
        completed_appointments = appointment_stats_qs.filter(status='completed').count()
        pending_appointments = appointment_stats_qs.filter(status='pending').count()
        reminded_appointments = appointment_stats_qs.filter(reminded_at__isnull=False).count()
        appointment_finish_rate = round(completed_appointments / total_appointments, 4) if total_appointments > 0 else 0

        family_member_counts = {}
        reminded_members_per_family = defaultdict(set)
        if not baby_id:
            family_qs = Family.objects.all()
            if family_id:
                family_qs = family_qs.filter(pk=family_id)
            for family in family_qs:
                member_count = FamilyMember.objects.filter(family=family).count()
                family_member_counts[family.id] = member_count
                family_babies = Baby.objects.filter(family=family)
                reminded_users = Appointment.objects.filter(
                    baby__in=family_babies,
                    reminded_by__isnull=False,
                ).values_list('reminded_by_id', flat=True).distinct()
                reminded_members_per_family[family.id] = set(reminded_users)
        else:
            single_baby = Baby.objects.filter(pk=baby_id).first()
            if single_baby and single_baby.family_id:
                family_member_counts[single_baby.family_id] = FamilyMember.objects.filter(family_id=single_baby.family_id).count()
                reminded_users = Appointment.objects.filter(
                    baby=single_baby,
                    reminded_by__isnull=False,
                ).values_list('reminded_by_id', flat=True).distinct()
                reminded_members_per_family[single_baby.family_id] = set(reminded_users)

        total_family_members = sum(family_member_counts.values())
        total_reminded_members = sum(len(v) for v in reminded_members_per_family.values())
        avg_family_reminder_coverage = 0
        if family_member_counts:
            coverages = []
            for fid, total_m in family_member_counts.items():
                reminded_c = len(reminded_members_per_family.get(fid, set()))
                if total_m > 0:
                    coverages.append(reminded_c / total_m)
            avg_family_reminder_coverage = round(sum(coverages) / len(coverages), 4) if coverages else 0

        by_month_progress = []
        global_max_age = 36
        for month in range(global_max_age + 1):
            month_total_v = 0
            month_done_v = 0
            month_total_c = 0
            month_done_c = 0
            for baby in babies_qs:
                if _calculate_age_months(baby.birth_date, today) >= month:
                    vs = VaccinationSchedule.objects.filter(
                        baby=baby,
                        vaccine__applicable_age_months=month,
                    )
                    month_total_v += vs.count()
                    month_done_v += vs.filter(status='completed').count()
                    cus = Checkup.objects.filter(applicable_age_months=month)
                    for cu in cus:
                        month_total_c += 1
                        ms = baby.birth_date + relativedelta(months=month)
                        me = baby.birth_date + relativedelta(months=month + 1)
                        if CheckupRecord.objects.filter(baby=baby, checkup=cu, checkup_date__gte=ms, checkup_date__lt=me).exists():
                            month_done_c += 1
            if month_total_v > 0 or month_total_c > 0:
                total_m = month_total_v + month_total_c
                done_m = month_done_v + month_done_c
                by_month_progress.append({
                    'month': month,
                    'total': total_m,
                    'completed': done_m,
                    'completion_rate': round(done_m / total_m, 4) if total_m > 0 else 0,
                })

        return Response({
            'overview': {
                'total_babies': total_babies,
                'total_tasks': total_tasks,
                'total_vaccine_tasks': total_vaccine_tasks,
                'total_checkup_tasks': total_checkup_tasks,
                'total_completed': total_completed,
                'completed_vaccine_tasks': completed_vaccine_tasks,
                'completed_checkup_tasks': completed_checkup_tasks,
                'total_pending': total_pending,
                'overdue_tasks': overdue_tasks,
            },
            'completion_metrics': {
                'overall_completion_rate': completion_rate,
                'overall_completion_percent': round(completion_rate * 100, 2),
                'vaccine_completion_rate': round(completed_vaccine_tasks / total_vaccine_tasks, 4) if total_vaccine_tasks > 0 else 0,
                'checkup_completion_rate': round(completed_checkup_tasks / total_checkup_tasks, 4) if total_checkup_tasks > 0 else 0,
            },
            'appointment_metrics': {
                'total_appointments': total_appointments,
                'completed_appointments': completed_appointments,
                'pending_appointments': pending_appointments,
                'appointment_finish_rate': appointment_finish_rate,
                'tasks_with_appointment': total_with_appointment,
                'vaccine_with_appointment': vaccine_with_appointment,
                'checkup_with_appointment': checkup_with_appointment,
                'appointment_conversion_rate': appointment_conversion_rate,
                'appointment_conversion_percent': round(appointment_conversion_rate * 100, 2),
            },
            'reminder_metrics': {
                'reminded_appointments': reminded_appointments,
                'reminded_pending_tasks': all_pending_tasks_reminded,
                'pending_tasks_with_appointment': all_pending_tasks_with_appointment,
                'reminder_coverage_rate': reminder_coverage_rate,
                'reminder_coverage_percent': round(reminder_coverage_rate * 100, 2),
            },
            'family_metrics': {
                'families_count': len(family_member_counts),
                'total_family_members': total_family_members,
                'reminded_family_members': total_reminded_members,
                'avg_family_reminder_coverage': avg_family_reminder_coverage,
                'avg_family_reminder_coverage_percent': round(avg_family_reminder_coverage * 100, 2),
            },
            'by_month_progress': by_month_progress,
        })


class FamilyReminderStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        family_id = request.query_params.get('family_id')
        baby_id = request.query_params.get('baby_id')

        if not family_id and not baby_id:
            families = Family.objects.all()
        elif family_id:
            families = Family.objects.filter(pk=family_id)
        else:
            baby = Baby.objects.filter(pk=baby_id).first()
            families = Family.objects.filter(pk=baby.family_id) if baby and baby.family_id else Family.objects.none()

        result = []
        for family in families:
            members = FamilyMember.objects.filter(family=family).select_related('user', 'user__profile')
            babies_in_family = Baby.objects.filter(family=family)
            member_data = []
            for member in members:
                user = member.user
                reminded_appointments_count = Appointment.objects.filter(
                    baby__in=babies_in_family,
                    reminded_by=user,
                ).count()
                recent_reminders = Appointment.objects.filter(
                    baby__in=babies_in_family,
                    reminded_by=user,
                ).order_by('-reminded_at').values('id', 'appointment_date', 'time_slot', 'baby__name', 'appointment_type')[:5]
                member_data.append({
                    'member_id': member.id,
                    'user_id': user.id,
                    'username': user.username,
                    'role': member.role,
                    'role_label': member.get_role_display(),
                    'relation': user.profile.relation_with_baby if hasattr(user, 'profile') else None,
                    'relation_label': user.profile.get_relation_with_baby_display() if hasattr(user, 'profile') else None,
                    'reminded_count': reminded_appointments_count,
                    'recent_reminders': [
                        {
                            'id': r['id'],
                            'date': str(r['appointment_date']),
                            'baby_name': r['baby__name'],
                            'type': r['appointment_type'],
                        } for r in recent_reminders
                    ],
                    'joined_at': str(member.joined_at) if member.joined_at else None,
                })
            reminded_user_ids = Appointment.objects.filter(
                baby__in=babies_in_family,
                reminded_by__isnull=False,
            ).values_list('reminded_by_id', flat=True).distinct()
            reminded_set = set(reminded_user_ids)
            total_members = members.count()
            reminded_count = sum(1 for m in member_data if m['reminded_count'] > 0)
            result.append({
                'family_id': family.id,
                'family_name': family.name,
                'total_members': total_members,
                'reminded_members_count': reminded_count,
                'not_reminded_members_count': total_members - reminded_count,
                'coverage_rate': round(reminded_count / total_members, 4) if total_members > 0 else 0,
                'members': member_data,
            })
        return Response(result)
