from rest_framework import serializers
from django.contrib.auth.models import User
from .models import MedicalArchive, ArchiveTag, ArchiveView, ArchiveStatusLog


class ArchiveTagSerializer(serializers.ModelSerializer):
    archives_count = serializers.SerializerMethodField()

    class Meta:
        model = ArchiveTag
        fields = ['id', 'name', 'color', 'archives_count', 'created_at']
        read_only_fields = ['created_at']

    def get_archives_count(self, obj):
        return obj.archives.count()


class ArchiveViewSerializer(serializers.ModelSerializer):
    viewer_name = serializers.SerializerMethodField()
    viewer_relation = serializers.SerializerMethodField()

    class Meta:
        model = ArchiveView
        fields = ['id', 'archive', 'viewer', 'viewer_name', 'viewer_relation', 'viewed_at']
        read_only_fields = ['archive', 'viewer', 'viewed_at']

    def get_viewer_name(self, obj):
        if obj.viewer:
            return obj.viewer.username
        return None

    def get_viewer_relation(self, obj):
        if obj.viewer and hasattr(obj.viewer, 'profile'):
            return obj.viewer.profile.get_relation_with_baby_display()
        return None


class ArchiveStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    old_status_label = serializers.SerializerMethodField()
    new_status_label = serializers.SerializerMethodField()

    class Meta:
        model = ArchiveStatusLog
        fields = ['id', 'archive', 'old_status', 'old_status_label', 'new_status', 'new_status_label',
                  'changed_by', 'changed_by_name', 'change_reason', 'changed_at']
        read_only_fields = ['archive', 'changed_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.username
        return None

    def get_old_status_label(self, obj):
        return dict(MedicalArchive.STATUS_CHOICES).get(obj.old_status, obj.old_status)

    def get_new_status_label(self, obj):
        return dict(MedicalArchive.STATUS_CHOICES).get(obj.new_status, obj.new_status)


class MedicalArchiveSerializer(serializers.ModelSerializer):
    baby_name = serializers.SerializerMethodField()
    archive_type_label = serializers.SerializerMethodField()
    source_type_label = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    view_permission_label = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    handled_by_name = serializers.SerializerMethodField()
    tags = ArchiveTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=ArchiveTag.objects.all(), source='tags', required=False
    )
    views = ArchiveViewSerializer(many=True, read_only=True)
    status_logs = ArchiveStatusLogSerializer(many=True, read_only=True)
    viewers_count = serializers.SerializerMethodField()
    age_months_at_event = serializers.SerializerMethodField()
    event_month_key = serializers.SerializerMethodField()
    appointment_info = serializers.SerializerMethodField()
    health_event_info = serializers.SerializerMethodField()
    reaction_info = serializers.SerializerMethodField()
    family_info = serializers.SerializerMethodField()
    allowed_viewer_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=User.objects.all(), source='allowed_viewers', required=False
    )
    allowed_viewers_info = serializers.SerializerMethodField()

    class Meta:
        model = MedicalArchive
        fields = [
            'id', 'baby', 'baby_name', 'family', 'family_info',
            'title', 'archive_type', 'archive_type_label',
            'source_type', 'source_type_label',
            'appointment', 'appointment_info',
            'health_event', 'health_event_info',
            'reaction', 'reaction_info',
            'preparation_checklist',
            'event_date', 'age_months_at_event', 'event_month_key',
            'description', 'doctor_name', 'hospital',
            'file_url', 'file_name', 'thumbnail_url',
            'tags', 'tag_ids',
            'status', 'status_label', 'expiry_date',
            'view_permission', 'view_permission_label',
            'allowed_viewers', 'allowed_viewer_ids', 'allowed_viewers_info',
            'created_by', 'created_by_name',
            'handled_by', 'handled_by_name',
            'remarks', 'views', 'viewers_count', 'status_logs',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'source_type']

    def get_baby_name(self, obj):
        return obj.baby.name if obj.baby else None

    def get_archive_type_label(self, obj):
        return obj.get_archive_type_display()

    def get_source_type_label(self, obj):
        return obj.get_source_type_display()

    def get_status_label(self, obj):
        return obj.get_status_display()

    def get_view_permission_label(self, obj):
        return obj.get_view_permission_display()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None

    def get_handled_by_name(self, obj):
        if obj.handled_by:
            return obj.handled_by.username
        return None

    def get_viewers_count(self, obj):
        return obj.views.count()

    def get_age_months_at_event(self, obj):
        return obj.get_age_months_at_event()

    def get_event_month_key(self, obj):
        return obj.get_event_month_key()

    def get_appointment_info(self, obj):
        if obj.appointment:
            apt = obj.appointment
            return {
                'id': apt.id,
                'appointment_date': apt.appointment_date,
                'time_slot': apt.time_slot,
                'time_slot_label': apt.get_time_slot_display(),
                'appointment_type': apt.appointment_type,
                'appointment_type_label': apt.get_appointment_type_display(),
                'status': apt.status,
                'status_label': apt.get_status_display(),
                'hospital': apt.hospital,
                'vaccine_name': apt.vaccine.name if apt.vaccine else None,
                'checkup_type': apt.checkup_type,
            }
        return None

    def get_health_event_info(self, obj):
        if obj.health_event:
            he = obj.health_event
            return {
                'id': he.id,
                'event_type': he.event_type,
                'event_type_label': he.get_event_type_display(),
                'severity': he.severity,
                'severity_label': he.get_severity_display(),
                'status': he.status,
                'status_label': he.get_status_display(),
                'occurrence_time': he.occurrence_time,
                'symptoms': he.symptoms,
            }
        return None

    def get_reaction_info(self, obj):
        if obj.reaction:
            r = obj.reaction
            return {
                'id': r.id,
                'reaction_type': r.reaction_type,
                'severity': r.severity,
                'severity_label': r.get_severity_display(),
                'occurrence_time': r.occurrence_time,
                'symptoms': r.symptoms,
            }
        return None

    def get_family_info(self, obj):
        if obj.family:
            return {
                'id': obj.family.id,
                'name': obj.family.name,
            }
        return None

    def get_allowed_viewers_info(self, obj):
        result = []
        for user in obj.allowed_viewers.all():
            relation = None
            if hasattr(user, 'profile'):
                relation = user.profile.get_relation_with_baby_display()
            result.append({
                'user_id': user.id,
                'username': user.username,
                'relation': relation,
            })
        return result


class MedicalArchiveTimelineSerializer(serializers.Serializer):
    month_key = serializers.CharField()
    month_label = serializers.CharField()
    archives = MedicalArchiveSerializer(many=True)


class MedicalArchiveSummarySerializer(serializers.Serializer):
    total_count = serializers.IntegerField()
    by_type = serializers.ListField(child=serializers.DictField())
    by_status = serializers.ListField(child=serializers.DictField())
    by_month = serializers.ListField(child=serializers.DictField())
