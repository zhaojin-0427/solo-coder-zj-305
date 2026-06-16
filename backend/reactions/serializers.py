from rest_framework import serializers
from .models import Reaction


class ReactionSerializer(serializers.ModelSerializer):
    appointment_info = serializers.SerializerMethodField()

    class Meta:
        model = Reaction
        fields = '__all__'

    def get_appointment_info(self, obj):
        appointment = obj.appointment
        return {
            'id': appointment.id,
            'appointment_date': appointment.appointment_date,
            'time_slot': appointment.time_slot,
            'appointment_type': appointment.appointment_type,
            'status': appointment.status,
            'hospital': appointment.hospital,
        }
