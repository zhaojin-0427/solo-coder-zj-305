from rest_framework.routers import DefaultRouter
from .views import BabyViewSet

router = DefaultRouter()
router.register(r'', BabyViewSet, basename='baby')

urlpatterns = router.urls
