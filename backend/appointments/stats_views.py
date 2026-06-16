from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from vaccines.models import Vaccine, VaccinationSchedule
from appointments.models import Appointment
from reactions.models import Reaction
from checkups.models import CheckupRecord, Checkup
from babies.models import Baby

AGE_STAGES = [
    ('0-6月', 0, 6),
    ('6-12月', 6, 12),
    ('12-18月', 12, 18),
    ('18-24月', 18, 24),
    ('24-36月', 24, 36),
    ('36月+', 36, 999),
]


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
