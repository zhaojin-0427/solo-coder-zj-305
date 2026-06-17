from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthEventViewSet

router = DefaultRouter()
router.register(r'', HealthEventViewSet, basename='health-event')

urlpatterns = [
    path('', include(router.urls)),
]
