from rest_framework import serializers
from .models import PreparationChecklist, ChecklistItem, ArrivalVerification


class ChecklistItemSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    confirmed_by_name = serializers.CharField(source='confirmed_by.username', read_only=True, default=None)

    class Meta:
        model = ChecklistItem
        fields = '__all__'


class PreparationChecklistSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    baby_name = serializers.CharField(source='baby.name', read_only=True)
    appointment_info = serializers.SerializerMethodField()

    class Meta:
        model = PreparationChecklist
        fields = '__all__'

    def get_appointment_info(self, obj):
        apt = obj.appointment
        return {
            'id': apt.id,
            'appointment_type': apt.appointment_type,
            'appointment_type_label': apt.get_appointment_type_display(),
            'appointment_date': str(apt.appointment_date),
            'time_slot': apt.time_slot,
            'time_slot_label': apt.get_time_slot_display(),
            'hospital': apt.hospital,
            'status': apt.status,
            'vaccine_name': apt.vaccine.short_name if apt.vaccine else None,
            'checkup_type': apt.checkup_type or None,
        }


class ArrivalVerificationSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True, default=None)
    checklist_info = PreparationChecklistSerializer(source='checklist', read_only=True)

    class Meta:
        model = ArrivalVerification
        fields = '__all__'
