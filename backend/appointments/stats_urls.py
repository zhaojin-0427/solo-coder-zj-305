from django.urls import path
from . import stats_views

urlpatterns = [
    path('', stats_views.StatsView.as_view(), name='stats-overview'),
    path('vaccination-rate/', stats_views.VaccinationRateView.as_view(), name='stats-vaccination-rate'),
    path('delay-count/', stats_views.DelayCountView.as_view(), name='stats-delay-count'),
    path('reaction-distribution/', stats_views.ReactionDistributionView.as_view(), name='stats-reaction-distribution'),
    path('monthly-progress/', stats_views.MonthlyProgressView.as_view(), name='stats-monthly-progress'),
    path('collaboration/', stats_views.CollaborationStatsView.as_view(), name='stats-collaboration'),
    path('family-reminders/', stats_views.FamilyReminderStatsView.as_view(), name='stats-family-reminders'),
    path('preparation/', stats_views.PreparationStatsView.as_view(), name='stats-preparation'),
]
