from datetime import date
from dateutil.relativedelta import relativedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from accounts.models import FamilyMember
from vaccines.models import Vaccine, VaccinationSchedule
from .models import Baby
from .serializers import BabySerializer, BabyListSerializer


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
