from rest_framework import serializers
from .models import Checkup, CheckupRecord


class CheckupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Checkup
        fields = '__all__'


class CheckupRecordSerializer(serializers.ModelSerializer):
    baby_name = serializers.CharField(source='baby.name', read_only=True)
    checkup_name = serializers.CharField(source='checkup.name', read_only=True, default=None)

    class Meta:
        model = CheckupRecord
        fields = '__all__'
