from datetime import date
from rest_framework import serializers
from .models import Baby


class BabyListSerializer(serializers.ModelSerializer):
    age_months = serializers.SerializerMethodField()

    class Meta:
        model = Baby
        fields = ['id', 'name', 'gender', 'birth_date', 'age_months', 'hospital_preference']

    def get_age_months(self, obj):
        today = date.today()
        months = (today.year - obj.birth_date.year) * 12 + (today.month - obj.birth_date.month)
        if today.day < obj.birth_date.day:
            months -= 1
        return months


class BabySerializer(BabyListSerializer):
    age_months = serializers.SerializerMethodField()

    class Meta:
        model = Baby
        fields = '__all__'

    def get_age_months(self, obj):
        today = date.today()
        months = (today.year - obj.birth_date.year) * 12 + (today.month - obj.birth_date.month)
        if today.day < obj.birth_date.day:
            months -= 1
        return months
