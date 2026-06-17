from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from django.db.models import Q, Count
from datetime import date, datetime
from collections import defaultdict
from babies.models import Baby
from accounts.models import FamilyMember
from .models import MedicalArchive, ArchiveTag, ArchiveView, ArchiveStatusLog
from .serializers import (
    MedicalArchiveSerializer,
    ArchiveTagSerializer,
    ArchiveViewSerializer,
    ArchiveStatusLogSerializer,
)


class ArchiveTagViewSet(viewsets.ModelViewSet):
    queryset = ArchiveTag.objects.annotate(archives_count=Count('archives')).all()
    serializer_class = ArchiveTagSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['name']


class MedicalArchiveViewSet(viewsets.ModelViewSet):
    queryset = MedicalArchive.objects.select_related(
        'baby', 'family', 'appointment', 'health_event', 'reaction',
        'preparation_checklist', 'created_by', 'handled_by'
    ).prefetch_related('tags', 'views', 'status_logs', 'allowed_viewers').all()
    serializer_class = MedicalArchiveSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby', 'family', 'archive_type', 'source_type', 'status', 'view_permission']

    def get_queryset(self):
        qs = super().get_queryset()
        baby_id = self.request.query_params.get('baby_id')
        if baby_id:
            qs = qs.filter(baby_id=baby_id)
        family_id = self.request.query_params.get('family_id')
        if family_id:
            qs = qs.filter(family_id=family_id)
        appointment_id = self.request.query_params.get('appointment_id')
        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)
        health_event_id = self.request.query_params.get('health_event_id')
        if health_event_id:
            qs = qs.filter(health_event_id=health_event_id)
        reaction_id = self.request.query_params.get('reaction_id')
        if reaction_id:
            qs = qs.filter(reaction_id=reaction_id)
        archive_type = self.request.query_params.get('archive_type')
        if archive_type:
            qs = qs.filter(archive_type=archive_type)
        source_type = self.request.query_params.get('source_type')
        if source_type:
            qs = qs.filter(source_type=source_type)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        age_month_min = self.request.query_params.get('age_month_min')
        if age_month_min is not None:
            age_month_min = int(age_month_min)
            ids = [a.id for a in qs if a.get_age_months_at_event() is not None and a.get_age_months_at_event() >= age_month_min]
            qs = qs.filter(pk__in=ids)
        age_month_max = self.request.query_params.get('age_month_max')
        if age_month_max is not None:
            age_month_max = int(age_month_max)
            ids = [a.id for a in qs if a.get_age_months_at_event() is not None and a.get_age_months_at_event() <= age_month_max]
            qs = qs.filter(pk__in=ids)
        tag_ids = self.request.query_params.getlist('tag_ids')
        if tag_ids:
            qs = qs.filter(tags__id__in=tag_ids).distinct()
        event_date_from = self.request.query_params.get('event_date_from')
        if event_date_from:
            qs = qs.filter(event_date__gte=event_date_from)
        event_date_to = self.request.query_params.get('event_date_to')
        if event_date_to:
            qs = qs.filter(event_date__lte=event_date_to)
        return qs

    def perform_create(self, serializer):
        baby_id = self.request.data.get('baby') or self.request.data.get('baby_id')
        family_id = None
        if baby_id:
            try:
                baby = Baby.objects.get(pk=baby_id)
                if baby.family:
                    family_id = baby.family.id
            except Baby.DoesNotExist:
                pass
        user_id = self.request.data.get('created_by') or self.request.data.get('user_id')
        user = None
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                pass
        save_kwargs = {}
        if family_id:
            save_kwargs['family_id'] = family_id
        if user:
            save_kwargs['created_by'] = user
        if self.request.data.get('appointment_id') and not self.request.data.get('appointment'):
            save_kwargs['appointment_id'] = self.request.data['appointment_id']
        if self.request.data.get('health_event_id') and not self.request.data.get('health_event'):
            save_kwargs['health_event_id'] = self.request.data['health_event_id']
        if self.request.data.get('reaction_id') and not self.request.data.get('reaction'):
            save_kwargs['reaction_id'] = self.request.data['reaction_id']
        if save_kwargs:
            serializer.save(**save_kwargs)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='mark-viewed')
    def mark_viewed(self, request, pk=None):
        archive = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        view, created = ArchiveView.objects.get_or_create(archive=archive, viewer=user)
        serializer = ArchiveViewSerializer(view)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        archive = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in MedicalArchive.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'detail': f'Invalid status. Must be one of: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
        old_status = archive.status
        user_id = request.data.get('user_id') or request.data.get('changed_by')
        user = None
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                pass
        handled_by_id = request.data.get('handled_by')
        if handled_by_id:
            try:
                archive.handled_by = User.objects.get(pk=handled_by_id)
            except User.DoesNotExist:
                pass
        archive.status = new_status
        archive.save()
        change_reason = request.data.get('change_reason', '')
        ArchiveStatusLog.objects.create(
            archive=archive,
            old_status=old_status,
            new_status=new_status,
            changed_by=user,
            change_reason=change_reason,
        )
        serializer = self.get_serializer(archive)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='assign-handler')
    def assign_handler(self, request, pk=None):
        archive = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        archive.handled_by = user
        archive.save()
        serializer = self.get_serializer(archive)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='update-view-permission')
    def update_view_permission(self, request, pk=None):
        archive = self.get_object()
        permission = request.data.get('view_permission')
        valid_perms = [p[0] for p in MedicalArchive.PERMISSION_CHOICES]
        if permission not in valid_perms:
            return Response({'detail': f'Invalid permission. Must be one of: {valid_perms}'}, status=status.HTTP_400_BAD_REQUEST)
        archive.view_permission = permission
        allowed_viewer_ids = request.data.get('allowed_viewer_ids', [])
        if permission == 'custom' and allowed_viewer_ids:
            archive.allowed_viewers.set(allowed_viewer_ids)
        elif permission != 'custom':
            archive.allowed_viewers.clear()
        archive.save()
        serializer = self.get_serializer(archive)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def timeline(self, request):
        baby_id = request.query_params.get('baby_id')
        if not baby_id:
            return Response({'detail': 'baby_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        qs = self.get_queryset().filter(baby_id=baby_id)
        month_groups = defaultdict(list)
        for archive in qs:
            month_key = archive.get_event_month_key()
            if month_key:
                month_groups[month_key].append(archive)
        result = []
        for month_key in sorted(month_groups.keys(), reverse=True):
            year, month = month_key.split('-')
            archives = sorted(month_groups[month_key], key=lambda a: a.event_date, reverse=True)
            serializer = MedicalArchiveSerializer(archives, many=True)
            result.append({
                'month_key': month_key,
                'month_label': f'{year}年{int(month)}月',
                'archives': serializer.data,
            })
        return Response(result)

    @action(detail=False, methods=['get'], url_path='expiring-soon')
    def expiring_soon(self, request):
        days = int(request.query_params.get('days', 30))
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')
        today = date.today()
        from datetime import timedelta
        end_date = today + timedelta(days=days)
        qs = self.get_queryset().filter(
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=end_date,
        ).exclude(status__in=['expired', 'archived_obsolete'])
        if baby_id:
            qs = qs.filter(baby_id=baby_id)
        if family_id:
            qs = qs.filter(family_id=family_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')
        qs = self.get_queryset()
        if baby_id:
            qs = qs.filter(baby_id=baby_id)
        if family_id:
            qs = qs.filter(family_id=family_id)
        total = qs.count()
        by_type = {}
        by_status = {}
        type_choices = dict(MedicalArchive.ARCHIVE_TYPE_CHOICES)
        status_choices = dict(MedicalArchive.STATUS_CHOICES)
        for archive in qs:
            t = archive.archive_type
            s = archive.status
            by_type[t] = by_type.get(t, 0) + 1
            by_status[s] = by_status.get(s, 0) + 1
        by_type_list = [
            {'archive_type': k, 'archive_type_label': type_choices.get(k, k), 'count': v}
            for k, v in sorted(by_type.items(), key=lambda x: -x[1])
        ]
        by_status_list = [
            {'status': k, 'status_label': status_choices.get(k, k), 'count': v}
            for k, v in sorted(by_status.items(), key=lambda x: -x[1])
        ]
        month_groups = defaultdict(int)
        for archive in qs:
            mk = archive.get_event_month_key()
            if mk:
                month_groups[mk] += 1
        by_month = [
            {'month_key': k, 'count': v}
            for k, v in sorted(month_groups.items())
        ]
        return Response({
            'total_count': total,
            'by_type': by_type_list,
            'by_status': by_status_list,
            'by_month': by_month,
        })
