from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Reaction
from .serializers import ReactionSerializer


class ReactionViewSet(viewsets.ModelViewSet):
    queryset = Reaction.objects.select_related('appointment', 'appointment__baby').all()
    serializer_class = ReactionSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['appointment', 'severity']

    def get_queryset(self):
        qs = super().get_queryset()
        baby_id = self.request.query_params.get('baby_id')
        if baby_id:
            qs = qs.filter(appointment__baby_id=baby_id)
        return qs
