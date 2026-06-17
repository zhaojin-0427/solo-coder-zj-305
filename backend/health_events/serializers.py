from rest_framework import serializers
from .models import HealthEvent, HealthEventUpdate, HealthEventView


class HealthEventUpdateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = HealthEventUpdate
        fields = ['id', 'event', 'update_type', 'content', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['event', 'created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None


class HealthEventViewSerializer(serializers.ModelSerializer):
    viewer_name = serializers.SerializerMethodField()
    viewer_relation = serializers.SerializerMethodField()

    class Meta:
        model = HealthEventView
        fields = ['id', 'event', 'viewer', 'viewer_name', 'viewer_relation', 'viewed_at']
        read_only_fields = ['event', 'viewer', 'viewed_at']

    def get_viewer_name(self, obj):
        if obj.viewer:
            return obj.viewer.username
        return None

    def get_viewer_relation(self, obj):
        if obj.viewer and hasattr(obj.viewer, 'profile'):
            return obj.viewer.profile.get_relation_with_baby_display()
        return None


class HealthEventSerializer(serializers.ModelSerializer):
    baby_name = serializers.SerializerMethodField()
    vaccine_name = serializers.SerializerMethodField()
    appointment_info = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    followed_by_name = serializers.SerializerMethodField()
    followed_by_relation = serializers.SerializerMethodField()
    updates = HealthEventUpdateSerializer(many=True, read_only=True)
    views = HealthEventViewSerializer(many=True, read_only=True)
    viewers_count = serializers.SerializerMethodField()
    event_type_label = serializers.SerializerMethodField()
    severity_label = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    age_months_at_event = serializers.SerializerMethodField()

    class Meta:
        model = HealthEvent
        fields = [
            'id', 'baby', 'baby_name', 'appointment', 'appointment_info',
            'vaccine', 'vaccine_name', 'checkup_type',
            'event_type', 'event_type_label', 'severity', 'severity_label',
            'status', 'status_label', 'occurrence_time', 'symptoms',
            'temperature', 'treatment', 'doctor_advice', 'next_visit_date',
            'created_by', 'created_by_name', 'followed_by', 'followed_by_name',
            'followed_by_relation', 'remarks', 'updates', 'views',
            'viewers_count', 'age_months_at_event', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_baby_name(self, obj):
        return obj.baby.name if obj.baby else None

    def get_vaccine_name(self, obj):
        return obj.vaccine.name if obj.vaccine else None

    def get_appointment_info(self, obj):
        if obj.appointment:
            return {
                'id': obj.appointment.id,
                'appointment_date': obj.appointment.appointment_date,
                'time_slot': obj.appointment.time_slot,
                'appointment_type': obj.appointment.appointment_type,
                'status': obj.appointment.status,
                'hospital': obj.appointment.hospital,
            }
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None

    def get_followed_by_name(self, obj):
        if obj.followed_by:
            return obj.followed_by.username
        return None

    def get_followed_by_relation(self, obj):
        if obj.followed_by and hasattr(obj.followed_by, 'profile'):
            return obj.followed_by.profile.get_relation_with_baby_display()
        return None

    def get_viewers_count(self, obj):
        return obj.views.count()

    def get_event_type_label(self, obj):
        return obj.get_event_type_display()

    def get_severity_label(self, obj):
        return obj.get_severity_display()

    def get_status_label(self, obj):
        return obj.get_status_display()

    def get_age_months_at_event(self, obj):
        if obj.baby and obj.baby.birth_date and obj.occurrence_time:
            from datetime import date
            birth = obj.baby.birth_date
            occur = obj.occurrence_time.date()
            months = (occur.year - birth.year) * 12 + (occur.month - birth.month)
            if occur.day < birth.day:
                months -= 1
            return max(0, months)
        return None
