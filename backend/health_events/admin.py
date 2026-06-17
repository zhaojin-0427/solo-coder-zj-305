from django.contrib import admin
from .models import HealthEvent, HealthEventUpdate, HealthEventView


@admin.register(HealthEvent)
class HealthEventAdmin(admin.ModelAdmin):
    list_display = ['baby', 'event_type', 'severity', 'status', 'occurrence_time', 'created_by', 'followed_by']
    list_filter = ['event_type', 'severity', 'status']
    search_fields = ['baby__name', 'symptoms', 'treatment', 'doctor_advice']
    date_hierarchy = 'occurrence_time'


@admin.register(HealthEventUpdate)
class HealthEventUpdateAdmin(admin.ModelAdmin):
    list_display = ['event', 'update_type', 'created_by', 'created_at']
    list_filter = ['update_type']
    search_fields = ['content']


@admin.register(HealthEventView)
class HealthEventViewAdmin(admin.ModelAdmin):
    list_display = ['event', 'viewer', 'viewed_at']
    list_filter = ['viewer']
