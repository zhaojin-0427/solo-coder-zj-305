from django.contrib import admin
from .models import PreparationChecklist, ChecklistItem, ArrivalVerification


@admin.register(PreparationChecklist)
class PreparationChecklistAdmin(admin.ModelAdmin):
    list_display = ['id', 'baby', 'appointment', 'status', 'completion_rate', 'report_generated', 'created_at']
    list_filter = ['status', 'report_generated']
    search_fields = ['baby__name']


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'checklist', 'category', 'item_name', 'is_required', 'confirmed', 'sort_order']
    list_filter = ['category', 'confirmed', 'is_required']


@admin.register(ArrivalVerification)
class ArrivalVerificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'checklist', 'verified_by', 'verified_at', 'created_at']
