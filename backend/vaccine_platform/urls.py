from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from babies.views import BabyViewSet
from vaccines.views import VaccineViewSet, VaccinationScheduleViewSet
from appointments.views import AppointmentViewSet
from checkups.views import CheckupViewSet, CheckupRecordViewSet
from reactions.views import ReactionViewSet

router = DefaultRouter()
router.register(r'babies', BabyViewSet, basename='baby')
router.register(r'vaccines', VaccineViewSet, basename='vaccine')
router.register(r'vaccination-schedules', VaccinationScheduleViewSet, basename='vaccination-schedule')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'checkups', CheckupViewSet, basename='checkup')
router.register(r'checkup-records', CheckupRecordViewSet, basename='checkup-record')
router.register(r'reactions', ReactionViewSet, basename='reaction')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/accounts/', include('accounts.urls')),
    path('api/stats/', include('appointments.stats_urls')),
    path('api/preparation/', include('preparation.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
