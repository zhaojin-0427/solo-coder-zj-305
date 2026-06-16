from rest_framework.routers import DefaultRouter
from .views import CheckupViewSet, CheckupRecordViewSet

router = DefaultRouter()
router.register(r'checkups', CheckupViewSet)
router.register(r'checkup-records', CheckupRecordViewSet)

urlpatterns = router.urls
