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


from preparation.models import PreparationChecklist, ChecklistItem, ArrivalVerification
from health_events.models import HealthEvent
from collections import defaultdict as dd


class PreparationStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        checklists_qs = PreparationChecklist.objects.all()
        if baby_id:
            checklists_qs = checklists_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            checklists_qs = checklists_qs.filter(baby_id__in=baby_ids)

        total = checklists_qs.count()
        not_started = checklists_qs.filter(status='not_started').count()
        in_progress = checklists_qs.filter(status='in_progress').count()
        completed = checklists_qs.filter(status='completed').count()
        verified = checklists_qs.filter(status='verified').count()
        reports_generated = checklists_qs.filter(report_generated=True).count()

        verifications_qs = ArrivalVerification.objects.filter(checklist__in=checklists_qs)
        total_verifications = verifications_qs.count()
        total_missing = sum(len(v.missing_items) for v in verifications_qs)
        total_supplemented = sum(len(v.supplemented_items) for v in verifications_qs)

        avg_completion = 0
        if total > 0:
            avg_completion = round(sum(c.completion_rate for c in checklists_qs) / total, 4)

        by_category = {}
        all_items = ChecklistItem.objects.filter(checklist__in=checklists_qs)
        for item in all_items:
            cat = item.category
            if cat not in by_category:
                by_category[cat] = {'total': 0, 'confirmed': 0, 'required': 0, 'required_confirmed': 0}
            by_category[cat]['total'] += 1
            if item.confirmed:
                by_category[cat]['confirmed'] += 1
            if item.is_required:
                by_category[cat]['required'] += 1
                if item.confirmed:
                    by_category[cat]['required_confirmed'] += 1

        recent_checklists = checklists_qs.select_related('appointment', 'baby')[:10]
        recent_list = []
        for cl in recent_checklists:
            apt = cl.appointment
            recent_list.append({
                'id': cl.id,
                'baby_name': cl.baby.name,
                'appointment_date': str(apt.appointment_date),
                'appointment_type': apt.appointment_type,
                'vaccine_name': apt.vaccine.short_name if apt.vaccine else None,
                'checkup_type': apt.checkup_type or None,
                'status': cl.status,
                'status_label': cl.get_status_display(),
                'completion_rate': cl.completion_rate,
                'report_generated': cl.report_generated,
                'has_verification': ArrivalVerification.objects.filter(checklist=cl).exists(),
            })

        return Response({
            'overview': {
                'total_checklists': total,
                'not_started': not_started,
                'in_progress': in_progress,
                'completed': completed,
                'verified': verified,
                'reports_generated': reports_generated,
                'avg_completion_rate': avg_completion,
                'avg_completion_percent': round(avg_completion * 100, 2),
            },
            'verification_stats': {
                'total_verifications': total_verifications,
                'total_missing_items': total_missing,
                'total_supplemented_items': total_supplemented,
            },
            'by_category': by_category,
            'recent_checklists': recent_list,
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


class HealthEventStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        events_qs = HealthEvent.objects.select_related('baby', 'created_by', 'followed_by')

        if baby_id:
            events_qs = events_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            events_qs = events_qs.filter(baby_id__in=list(baby_ids))

        total = events_qs.count()
        by_status = {}
        by_severity = {}
        by_type = {}

        for event in events_qs:
            status = event.status
            severity = event.severity
            etype = event.event_type
            by_status[status] = by_status.get(status, 0) + 1
            by_severity[severity] = by_severity.get(severity, 0) + 1
            by_type[etype] = by_type.get(etype, 0) + 1

        observing = by_status.get('observing', 0)
        need_revisit = by_status.get('need_revisit', 0)
        relieved = by_status.get('relieved', 0)
        archived = by_status.get('archived', 0)

        revisit_rate = round(need_revisit / max(total, 1), 4)

        by_status_list = [
            {'status': k, 'status_label': dict(HealthEvent.STATUS_CHOICES).get(k, k), 'count': v}
            for k, v in sorted(by_status.items(), key=lambda x: -x[1])
        ]
        by_severity_list = [
            {'severity': k, 'severity_label': dict(HealthEvent.SEVERITY_CHOICES).get(k, k), 'count': v}
            for k, v in sorted(by_severity.items(), key=lambda x: -x[1])
        ]
        by_type_list = [
            {'event_type': k, 'event_type_label': dict(HealthEvent.EVENT_TYPE_CHOICES).get(k, k), 'count': v}
            for k, v in sorted(by_type.items(), key=lambda x: -x[1])
        ]

        return Response({
            'overview': {
                'total_events': total,
                'observing': observing,
                'need_revisit': need_revisit,
                'relieved': relieved,
                'archived': archived,
                'revisit_rate': revisit_rate,
                'revisit_rate_percent': round(revisit_rate * 100, 2),
            },
            'by_status': by_status_list,
            'by_severity': by_severity_list,
            'by_type': by_type_list,
        })


class HealthEventTrendView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')
        days = int(request.query_params.get('days', 30))

        events_qs = HealthEvent.objects.select_related('baby')

        if baby_id:
            events_qs = events_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            events_qs = events_qs.filter(baby_id__in=list(baby_ids))

        from datetime import date, timedelta
        today = date.today()
        start_date = today - timedelta(days=days - 1)

        date_counts = {}
        for i in range(days):
            d = start_date + timedelta(days=i)
            date_counts[str(d)] = 0

        events = events_qs.filter(occurrence_time__date__gte=start_date)
        for event in events:
            d = str(event.occurrence_time.date())
            if d in date_counts:
                date_counts[d] += 1

        result = []
        for d, cnt in sorted(date_counts.items()):
            result.append({'date': d, 'count': cnt})

        return Response(result)


class HealthEventSeverityDistributionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        events_qs = HealthEvent.objects.select_related('baby')

        if baby_id:
            events_qs = events_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            events_qs = events_qs.filter(baby_id__in=list(baby_ids))

        severity_choices = dict(HealthEvent.SEVERITY_CHOICES)
        severity_data = {}
        for sev_key, sev_label in severity_choices.items():
            type_dist = {}
            type_choices = dict(HealthEvent.EVENT_TYPE_CHOICES)
            sev_events = events_qs.filter(severity=sev_key)
            for t_key in type_choices.keys():
                type_dist[t_key] = {
                    'event_type_label': type_choices[t_key],
                    'count': sev_events.filter(event_type=t_key).count(),
                }
            severity_data[sev_key] = {
                'severity_label': sev_label,
                'total': sev_events.count(),
                'by_type': type_dist,
            }

        return Response(severity_data)


class HealthEventRevisitRateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        events_qs = HealthEvent.objects.select_related('baby')

        if baby_id:
            events_qs = events_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            events_qs = events_qs.filter(baby_id__in=list(baby_ids))

        total = events_qs.count()
        need_revisit = events_qs.filter(status='need_revisit').count()
        has_next_visit = events_qs.filter(next_visit_date__isnull=False).count()

        by_type = {}
        type_choices = dict(HealthEvent.EVENT_TYPE_CHOICES)
        for t_key, t_label in type_choices.items():
            type_events = events_qs.filter(event_type=t_key)
            type_total = type_events.count()
            type_revisit = type_events.filter(status='need_revisit').count()
            by_type[t_key] = {
                'event_type_label': t_label,
                'total': type_total,
                'need_revisit': type_revisit,
                'rate': round(type_revisit / max(type_total, 1), 4),
                'rate_percent': round(type_revisit / max(type_total, 1) * 100, 2),
            }

        return Response({
            'overview': {
                'total_events': total,
                'need_revisit_count': need_revisit,
                'has_next_visit_date': has_next_visit,
                'overall_revisit_rate': round(need_revisit / max(total, 1), 4),
                'overall_revisit_rate_percent': round(need_revisit / max(total, 1) * 100, 2),
            },
            'by_event_type': by_type,
        })


class HealthEventByAgeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        events_qs = HealthEvent.objects.select_related('baby')

        if baby_id:
            events_qs = events_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            events_qs = events_qs.filter(baby_id__in=list(baby_ids))

        age_stage_data = {}
        type_choices = dict(HealthEvent.EVENT_TYPE_CHOICES)

        for stage_name, min_month, max_month in AGE_STAGES:
            stage_events = []
            for event in events_qs:
                if not (event.baby and event.baby.birth_date and event.occurrence_time):
                    continue
                age_months = _calculate_age_months(event.baby.birth_date, event.occurrence_time.date())
                if min_month <= age_months < max_month:
                    stage_events.append(event)

            stage_total = len(stage_events)
            type_counts = {}
            for t_key in type_choices.keys():
                type_counts[t_key] = sum(1 for e in stage_events if e.event_type == t_key)

            age_stage_data[stage_name] = {
                'total': stage_total,
                'by_type': {
                    t_key: {
                        'event_type_label': type_choices[t_key],
                        'count': type_counts[t_key],
                        'rate': round(type_counts[t_key] / max(stage_total, 1), 4) if stage_total > 0 else 0,
                        'rate_percent': round(type_counts[t_key] / max(stage_total, 1) * 100, 2) if stage_total > 0 else 0,
                    }
                    for t_key in type_choices.keys()
                },
            }

        return Response(age_stage_data)


class HealthEventCollaborationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        events_qs = HealthEvent.objects.select_related(
            'baby', 'created_by', 'followed_by'
        ).prefetch_related('views')

        if baby_id:
            events_qs = events_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            events_qs = events_qs.filter(baby_id__in=list(baby_ids))

        total = events_qs.count()
        has_follower = events_qs.filter(followed_by__isnull=False).count()
        total_views_count = sum(e.views.count() for e in events_qs)

        creator_stats = dd(lambda: {'created_count': 0, 'viewed_count': 0, 'followed_count': 0})

        for event in events_qs:
            if event.created_by:
                uid = str(event.created_by.id)
                uname = event.created_by.username
                key = f'{uid}_{uname}'
                creator_stats[key]['created_count'] += 1
            if event.followed_by:
                uid = str(event.followed_by.id)
                uname = event.followed_by.username
                key = f'{uid}_{uname}'
                creator_stats[key]['followed_count'] += 1
            for view in event.views.all():
                uid = str(view.viewer.id)
                uname = view.viewer.username
                key = f'{uid}_{uname}'
                creator_stats[key]['viewed_count'] += 1

        member_stats = []
        for key, counts in creator_stats.items():
            parts = key.split('_', 1)
            uid = parts[0]
            uname = parts[1] if len(parts) > 1 else 'unknown'
            member_stats.append({
                'user_id': int(uid),
                'username': uname,
                'created_count': counts['created_count'],
                'viewed_count': counts['viewed_count'],
                'followed_count': counts['followed_count'],
            })

        return Response({
            'overview': {
                'total_events': total,
                'events_with_follower': has_follower,
                'follower_coverage_rate': round(has_follower / max(total, 1), 4),
                'follower_coverage_percent': round(has_follower / max(total, 1) * 100, 2),
                'total_views': total_views_count,
                'avg_views_per_event': round(total_views_count / max(total, 1), 2),
            },
            'member_stats': sorted(member_stats, key=lambda x: -(x['created_count'] + x['followed_count'] + x['viewed_count'])),
        })


from medical_archives.models import MedicalArchive, ArchiveView, ArchiveTag
from accounts.models import FamilyMember


class MedicalArchiveStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        archives_qs = MedicalArchive.objects.select_related(
            'baby', 'family', 'created_by', 'handled_by'
        ).prefetch_related('views', 'tags', 'allowed_viewers')

        if baby_id:
            archives_qs = archives_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            archives_qs = archives_qs.filter(baby_id__in=list(baby_ids))

        total = archives_qs.count()
        by_type = {}
        by_status = {}
        by_source = {}

        type_choices = dict(MedicalArchive.ARCHIVE_TYPE_CHOICES)
        status_choices = dict(MedicalArchive.STATUS_CHOICES)
        source_choices = dict(MedicalArchive.SOURCE_TYPE_CHOICES)

        for archive in archives_qs:
            t = archive.archive_type
            s = archive.status
            src = archive.source_type
            by_type[t] = by_type.get(t, 0) + 1
            by_status[s] = by_status.get(s, 0) + 1
            by_source[src] = by_source.get(src, 0) + 1

        by_type_list = [
            {'archive_type': k, 'archive_type_label': type_choices.get(k, k), 'count': v}
            for k, v in sorted(by_type.items(), key=lambda x: -x[1])
        ]
        by_status_list = [
            {'status': k, 'status_label': status_choices.get(k, k), 'count': v}
            for k, v in sorted(by_status.items(), key=lambda x: -x[1])
        ]
        by_source_list = [
            {'source_type': k, 'source_type_label': source_choices.get(k, k), 'count': v}
            for k, v in sorted(by_source.items(), key=lambda x: -x[1])
        ]

        with_file = archives_qs.exclude(file_url='').count()
        with_expiry = archives_qs.filter(expiry_date__isnull=False).count()
        expiring_soon = 0
        today = date.today()
        from datetime import timedelta
        for a in archives_qs:
            if a.expiry_date and today <= a.expiry_date <= today + timedelta(days=30):
                expiring_soon += 1

        total_views = ArchiveView.objects.filter(archive__in=archives_qs).count()

        tag_stats = []
        for tag in ArchiveTag.objects.all():
            cnt = tag.archives.filter(pk__in=archives_qs).count()
            if cnt > 0:
                tag_stats.append({
                    'tag_id': tag.id,
                    'tag_name': tag.name,
                    'tag_color': tag.color,
                    'count': cnt,
                })
        tag_stats = sorted(tag_stats, key=lambda x: -x['count'])

        overview = {
            'total_archives': total,
            'with_file': with_file,
            'with_expiry_date': with_expiry,
            'expiring_in_30_days': expiring_soon,
            'total_views': total_views,
            'avg_views_per_archive': round(total_views / max(total, 1), 2),
            'draft': by_status.get('draft', 0),
            'pending_review': by_status.get('pending_review', 0),
            'approved': by_status.get('approved', 0),
            'needs_action': by_status.get('needs_action', 0),
            'expired': by_status.get('expired', 0),
            'archived_obsolete': by_status.get('archived_obsolete', 0),
            'with_appointment': archives_qs.filter(appointment__isnull=False).count(),
            'with_health_event': archives_qs.filter(health_event__isnull=False).count(),
        }

        by_type_list_v2 = [
            {
                'archive_type': item['archive_type'],
                'type_label': item['archive_type_label'],
                'count': item['count'],
            } for item in by_type_list
        ]
        by_source_list_v2 = [
            {
                'source': item['source_type'],
                'source_label': item['source_type_label'],
                'count': item['count'],
            } for item in by_source_list
        ]

        return Response({
            'overview': overview,
            'by_type': by_type_list_v2,
            'by_status': by_status_list,
            'by_source': by_source_list_v2,
            'by_tag': tag_stats,
        })


class MedicalArchiveByAgeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        archives_qs = MedicalArchive.objects.select_related('baby')

        if baby_id:
            archives_qs = archives_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            archives_qs = archives_qs.filter(baby_id__in=list(baby_ids))

        age_stage_data = {}
        type_choices = dict(MedicalArchive.ARCHIVE_TYPE_CHOICES)

        for stage_name, min_month, max_month in AGE_STAGES:
            stage_archives = []
            for archive in archives_qs:
                age_months = archive.get_age_months_at_event()
                if age_months is not None and min_month <= age_months < max_month:
                    stage_archives.append(archive)

            stage_total = len(stage_archives)
            type_counts = {}
            for t_key in type_choices.keys():
                type_counts[t_key] = sum(1 for a in stage_archives if a.archive_type == t_key)

            age_stage_data[stage_name] = {
                'total': stage_total,
                'by_type': {
                    t_key: {
                        'archive_type_label': type_choices[t_key],
                        'count': type_counts[t_key],
                        'rate': round(type_counts[t_key] / max(stage_total, 1), 4) if stage_total > 0 else 0,
                        'rate_percent': round(type_counts[t_key] / max(stage_total, 1) * 100, 2) if stage_total > 0 else 0,
                    }
                    for t_key in type_choices.keys()
                },
            }

        return Response(age_stage_data)


class MedicalArchiveMonthlyTrendView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')
        months = int(request.query_params.get('months', 12))

        archives_qs = MedicalArchive.objects.select_related('baby')

        if baby_id:
            archives_qs = archives_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            archives_qs = archives_qs.filter(baby_id__in=list(baby_ids))

        today = date.today()
        month_data = {}
        for i in range(months):
            d = today - timedelta(days=i * 30)
            month_key = f'{d.year}-{d.month:02d}'
            month_data[month_key] = {'total': 0, 'by_type': {}}

        type_choices = dict(MedicalArchive.ARCHIVE_TYPE_CHOICES)
        for t_key in type_choices.keys():
            for mk in month_data.keys():
                month_data[mk]['by_type'][t_key] = 0

        for archive in archives_qs:
            mk = archive.get_event_month_key()
            if mk and mk in month_data:
                month_data[mk]['total'] += 1
                if archive.archive_type in month_data[mk]['by_type']:
                    month_data[mk]['by_type'][archive.archive_type] += 1

        result = []
        for mk in sorted(month_data.keys()):
            year, month = mk.split('-')
            result.append({
                'month_key': mk,
                'month_label': f'{year}年{int(month)}月',
                'total': month_data[mk]['total'],
                'by_type': [
                    {
                        'archive_type': k,
                        'archive_type_label': type_choices.get(k, k),
                        'count': v,
                    }
                    for k, v in month_data[mk]['by_type'].items()
                ],
            })

        return Response(result)


class MedicalArchiveFamilyCoverageView(APIView):
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
            archives_in_family = MedicalArchive.objects.filter(baby__in=babies_in_family)

            total_archives = archives_in_family.count()
            total_members = members.count()

            viewed_user_ids = ArchiveView.objects.filter(
                archive__in=archives_in_family
            ).values_list('viewer_id', flat=True).distinct()
            viewed_set = set(viewed_user_ids)

            member_data = []
            for member in members:
                user = member.user
                viewed_count = ArchiveView.objects.filter(
                    archive__in=archives_in_family,
                    viewer=user,
                ).count()
                created_count = archives_in_family.filter(created_by=user).count()
                handled_count = archives_in_family.filter(handled_by=user).count()

                recent_views = ArchiveView.objects.filter(
                    archive__in=archives_in_family,
                    viewer=user,
                ).select_related('archive').order_by('-viewed_at')[:5]

                member_data.append({
                    'member_id': member.id,
                    'user_id': user.id,
                    'username': user.username,
                    'role': member.role,
                    'role_label': member.get_role_display(),
                    'relation': user.profile.relation_with_baby if hasattr(user, 'profile') else None,
                    'relation_label': user.profile.get_relation_with_baby_display() if hasattr(user, 'profile') else None,
                    'viewed_count': viewed_count,
                    'created_count': created_count,
                    'handled_count': handled_count,
                    'has_viewed': viewed_count > 0,
                    'recent_views': [
                        {
                            'archive_id': v.archive.id,
                            'archive_title': v.archive.title,
                            'viewed_at': str(v.viewed_at),
                        } for v in recent_views
                    ],
                    'joined_at': str(member.joined_at) if member.joined_at else None,
                })

            viewed_members_count = sum(1 for m in member_data if m['has_viewed'])

            result.append({
                'family_id': family.id,
                'family_name': family.name,
                'total_members': total_members,
                'total_archives': total_archives,
                'viewed_members': viewed_members_count,
                'viewed_members_count': viewed_members_count,
                'not_viewed_members_count': total_members - viewed_members_count,
                'view_coverage_rate': round(viewed_members_count / max(total_members, 1), 4),
                'view_coverage_percent': round(viewed_members_count / max(total_members, 1) * 100, 2),
                'members': member_data,
            })

        total_families = len(result)
        active_families = sum(1 for f in result if f['total_archives'] > 0)
        inactive_families = total_families - active_families
        overall_viewed = sum(f['viewed_members'] for f in result)
        overall_members = sum(f['total_members'] for f in result)
        coverage_percent = round(overall_viewed / max(overall_members, 1), 4)

        overview = {
            'total_families': total_families,
            'active_families': active_families,
            'inactive_families': inactive_families,
            'coverage_percent': coverage_percent,
            'total_members': overall_members,
            'viewed_members': overall_viewed,
        }

        return Response({
            'overview': overview,
            'by_family': result,
        })
