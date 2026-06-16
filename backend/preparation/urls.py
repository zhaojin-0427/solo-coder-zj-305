from rest_framework.routers import DefaultRouter
from .views import PreparationChecklistViewSet, ArrivalVerificationViewSet

router = DefaultRouter()
router.register(r'checklists', PreparationChecklistViewSet, basename='preparation-checklist')
router.register(r'verifications', ArrivalVerificationViewSet, basename='arrival-verification')

urlpatterns = router.urls
