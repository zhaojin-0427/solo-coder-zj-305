from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VaccineViewSet, VaccinationScheduleViewSet

router = DefaultRouter()
router.register(r'', VaccineViewSet, basename='vaccine')
router.register(r'schedules', VaccinationScheduleViewSet, basename='vaccination-schedule')

urlpatterns = router.urls
