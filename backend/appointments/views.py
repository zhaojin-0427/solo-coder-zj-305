from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related('baby', 'vaccine', 'reminded_by').all()
    serializer_class = AppointmentSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby', 'status', 'appointment_type']

    def create(self, request, *args, **kwargs):
        baby_id = request.data.get('baby')
        appointment_date = request.data.get('appointment_date')
        time_slot = request.data.get('time_slot')
        if baby_id and appointment_date and time_slot:
            if Appointment.objects.filter(
                baby_id=baby_id,
                appointment_date=appointment_date,
                time_slot=time_slot
            ).exists():
                return Response(
                    {'detail': '该宝宝在此日期和时段已有预约，请勿重复预约。'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().create(request, *args, **kwargs)

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
