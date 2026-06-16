from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Checkup, CheckupRecord
from .serializers import CheckupSerializer, CheckupRecordSerializer


class CheckupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Checkup.objects.all()
    serializer_class = CheckupSerializer
    permission_classes = [AllowAny]


class CheckupRecordViewSet(viewsets.ModelViewSet):
    queryset = CheckupRecord.objects.select_related('baby', 'checkup').all()
    serializer_class = CheckupRecordSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby']
