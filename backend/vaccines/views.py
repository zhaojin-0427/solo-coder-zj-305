from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Vaccine, VaccinationSchedule
from .serializers import VaccineSerializer, VaccinationScheduleSerializer


class VaccineViewSet(viewsets.ModelViewSet):
    queryset = Vaccine.objects.all()
    serializer_class = VaccineSerializer
    permission_classes = [AllowAny]
    http_method_names = ['get', 'head', 'options']


class VaccinationScheduleViewSet(viewsets.ModelViewSet):
    queryset = VaccinationSchedule.objects.select_related('baby', 'vaccine').all()
    serializer_class = VaccinationScheduleSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby']

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        schedule = self.get_object()
        schedule.status = 'completed'
        schedule.actual_date = date.today()
        schedule.save()
        serializer = self.get_serializer(schedule)
        return Response(serializer.data)
