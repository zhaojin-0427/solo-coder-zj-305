from django.db import models
from appointments.models import Appointment


class Reaction(models.Model):
    SEVERITY_CHOICES = [
        ('mild', '轻微'),
        ('moderate', '中等'),
        ('severe', '严重'),
    ]

    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='reactions', verbose_name='预约')
    reaction_type = models.CharField(max_length=100, verbose_name='反应类型')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, verbose_name='严重程度')
    occurrence_time = models.DateTimeField(verbose_name='发生时间')
    symptoms = models.TextField(verbose_name='症状')
    treatment = models.TextField(blank=True, verbose_name='处理措施')
    doctor_advice = models.TextField(blank=True, verbose_name='医生建议')
    next_visit_notes = models.TextField(blank=True, verbose_name='复诊注意事项')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '不良反应'
        verbose_name_plural = '不良反应'
        ordering = ['-occurrence_time']

    def __str__(self):
        return f'{self.appointment} - {self.reaction_type} ({self.get_severity_display()})'
