from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    baby_name = serializers.CharField(source='baby.name', read_only=True)
    vaccine_name = serializers.CharField(source='vaccine.short_name', read_only=True, default=None)

    class Meta:
        model = Appointment
        fields = '__all__'
