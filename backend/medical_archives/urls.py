from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalArchiveViewSet, ArchiveTagViewSet

router = DefaultRouter()
router.register(r'archives', MedicalArchiveViewSet, basename='medical-archive')
router.register(r'tags', ArchiveTagViewSet, basename='archive-tag')

urlpatterns = [
    path('', include(router.urls)),
]
