from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from babies.models import Baby
from .models import HealthEvent, HealthEventUpdate, HealthEventView
from .serializers import (
    HealthEventSerializer,
    HealthEventUpdateSerializer,
    HealthEventViewSerializer,
)


class HealthEventViewSet(viewsets.ModelViewSet):
    queryset = HealthEvent.objects.select_related(
        'baby', 'appointment', 'vaccine', 'created_by', 'followed_by'
    ).prefetch_related('updates', 'views').all()
    serializer_class = HealthEventSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby', 'appointment', 'event_type', 'severity', 'status', 'created_by', 'followed_by']

    def get_queryset(self):
        qs = super().get_queryset()
        baby_id = self.request.query_params.get('baby_id')
        if baby_id:
            qs = qs.filter(baby_id=baby_id)
        family_id = self.request.query_params.get('family_id')
        if family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            qs = qs.filter(baby_id__in=list(baby_ids))
        appointment_id = self.request.query_params.get('appointment_id')
        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        severity = self.request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity)
        return qs

    @action(detail=True, methods=['post'])
    def add_update(self, request, pk=None):
        event = self.get_object()
        serializer = HealthEventUpdateSerializer(data=request.data)
        if serializer.is_valid():
            user_id = request.data.get('user_id') or request.data.get('created_by')
            user = None
            if user_id:
                try:
                    user = User.objects.get(pk=user_id)
                except User.DoesNotExist:
                    pass
            serializer.save(event=event, created_by=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        event = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        view, created = HealthEventView.objects.get_or_create(event=event, viewer=user)
        serializer = HealthEventViewSerializer(view)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        event = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = ['observing', 'need_revisit', 'relieved', 'archived']
        if new_status not in valid_statuses:
            return Response({'detail': f'Invalid status. Must be one of: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
        event.status = new_status

        followed_by_id = request.data.get('followed_by')
        if followed_by_id:
            try:
                event.followed_by = User.objects.get(pk=followed_by_id)
            except User.DoesNotExist:
                pass

        event.save()

        update_content = request.data.get('update_content')
        if update_content:
            user_id = request.data.get('user_id')
            user = None
            if user_id:
                try:
                    user = User.objects.get(pk=user_id)
                except User.DoesNotExist:
                    pass
            HealthEventUpdate.objects.create(
                event=event,
                update_type='status_change',
                content=f'状态变更为: {event.get_status_display()}。{update_content}',
                created_by=user,
            )

        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_follower(self, request, pk=None):
        event = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        event.followed_by = user
        event.save()

        assigned_by_id = request.data.get('assigned_by_id')
        assigned_by = None
        if assigned_by_id:
            try:
                assigned_by = User.objects.get(pk=assigned_by_id)
            except User.DoesNotExist:
                pass

        HealthEventUpdate.objects.create(
            event=event,
            update_type='assignment',
            content=f'跟进负责人已指定为: {user.username}',
            created_by=assigned_by,
        )

        serializer = self.get_serializer(event)
        return Response(serializer.data)
