from rest_framework import serializers
from .models import Vaccine, VaccinationSchedule


class VaccineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vaccine
        fields = '__all__'


class VaccinationScheduleSerializer(serializers.ModelSerializer):
    vaccine_name = serializers.CharField(source='vaccine.short_name', read_only=True)
    baby_name = serializers.CharField(source='baby.name', read_only=True)

    class Meta:
        model = VaccinationSchedule
        fields = '__all__'
