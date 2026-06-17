from django.contrib import admin
from .models import MedicalArchive, ArchiveTag, ArchiveView, ArchiveStatusLog


@admin.register(MedicalArchive)
class MedicalArchiveAdmin(admin.ModelAdmin):
    list_display = ['title', 'baby', 'archive_type', 'status', 'event_date', 'created_at']
    list_filter = ['archive_type', 'status', 'source_type']
    search_fields = ['title', 'baby__name']


@admin.register(ArchiveTag)
class ArchiveTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'created_at']


@admin.register(ArchiveView)
class ArchiveViewAdmin(admin.ModelAdmin):
    list_display = ['archive', 'viewer', 'viewed_at']


@admin.register(ArchiveStatusLog)
class ArchiveStatusLogAdmin(admin.ModelAdmin):
    list_display = ['archive', 'old_status', 'new_status', 'changed_by', 'changed_at']
