from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Reaction
from .serializers import ReactionSerializer


class ReactionViewSet(viewsets.ModelViewSet):
    queryset = Reaction.objects.select_related('appointment').all()
    serializer_class = ReactionSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['appointment', 'severity']
