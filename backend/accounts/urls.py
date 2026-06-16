from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, ProfileDetailView, FamilyViewSet, FamilyMemberViewSet, CurrentUserView

router = DefaultRouter()
router.register(r'families', FamilyViewSet, basename='family')
router.register(r'family-members', FamilyMemberViewSet, basename='family-member')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileDetailView.as_view(), name='profile'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('', include(router.urls)),
]
