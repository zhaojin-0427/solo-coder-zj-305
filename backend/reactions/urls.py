from rest_framework.routers import DefaultRouter
from .views import ReactionViewSet

router = DefaultRouter()
router.register(r'reactions', ReactionViewSet)

urlpatterns = router.urls
