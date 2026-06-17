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
    path('health-events/', stats_views.HealthEventStatsView.as_view(), name='stats-health-events'),
    path('health-events/trend/', stats_views.HealthEventTrendView.as_view(), name='stats-health-events-trend'),
    path('health-events/severity/', stats_views.HealthEventSeverityDistributionView.as_view(), name='stats-health-events-severity'),
    path('health-events/revisit-rate/', stats_views.HealthEventRevisitRateView.as_view(), name='stats-health-events-revisit-rate'),
    path('health-events/by-age/', stats_views.HealthEventByAgeView.as_view(), name='stats-health-events-by-age'),
    path('health-events/collaboration/', stats_views.HealthEventCollaborationView.as_view(), name='stats-health-events-collaboration'),
]
