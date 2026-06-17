from django.db import models
from django.contrib.auth.models import User
from babies.models import Baby
from appointments.models import Appointment
from vaccines.models import Vaccine


class HealthEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('fever', '发热'),
        ('rash', '皮疹'),
        ('crying', '异常哭闹'),
        ('appetite', '食欲变化'),
        ('sleep', '睡眠异常'),
        ('doctor_followup', '医生回访建议'),
        ('other', '其他健康事件'),
    ]

    SEVERITY_CHOICES = [
        ('mild', '轻微'),
        ('moderate', '中等'),
        ('severe', '严重'),
    ]

    STATUS_CHOICES = [
        ('observing', '观察中'),
        ('need_revisit', '需复诊'),
        ('relieved', '已缓解'),
        ('archived', '已归档'),
    ]

    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='health_events', verbose_name='宝宝')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, related_name='health_events', blank=True, null=True, verbose_name='关联预约')
    vaccine = models.ForeignKey(Vaccine, on_delete=models.SET_NULL, related_name='health_events', blank=True, null=True, verbose_name='关联疫苗')
    checkup_type = models.CharField(max_length=100, blank=True, verbose_name='关联体检类型')

    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES, verbose_name='事件类型')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, verbose_name='严重程度')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='observing', verbose_name='事件状态')

    occurrence_time = models.DateTimeField(verbose_name='发生时间')
    symptoms = models.TextField(verbose_name='症状描述')
    temperature = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True, verbose_name='体温(℃)')
    treatment = models.TextField(blank=True, verbose_name='处理措施')
    doctor_advice = models.TextField(blank=True, verbose_name='医生建议')
    next_visit_date = models.DateField(blank=True, null=True, verbose_name='建议复诊日期')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='created_health_events', blank=True, null=True, verbose_name='记录人')
    followed_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='followed_health_events', blank=True, null=True, verbose_name='跟进负责人')

    remarks = models.TextField(blank=True, verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '健康事件'
        verbose_name_plural = '健康事件'
        ordering = ['-occurrence_time', '-created_at']

    def __str__(self):
        return f'{self.baby.name} - {self.get_event_type_display()} ({self.get_status_display()})'


class HealthEventUpdate(models.Model):
    event = models.ForeignKey(HealthEvent, on_delete=models.CASCADE, related_name='updates', verbose_name='健康事件')
    update_type = models.CharField(max_length=50, default='progress', verbose_name='更新类型')
    content = models.TextField(verbose_name='更新内容')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='health_event_updates', blank=True, null=True, verbose_name='更新人')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '健康事件进展'
        verbose_name_plural = '健康事件进展'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event} - 更新记录'


class HealthEventView(models.Model):
    event = models.ForeignKey(HealthEvent, on_delete=models.CASCADE, related_name='views', verbose_name='健康事件')
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='viewed_health_events', verbose_name='查看人')
    viewed_at = models.DateTimeField(auto_now_add=True, verbose_name='查看时间')

    class Meta:
        verbose_name = '健康事件查看记录'
        verbose_name_plural = '健康事件查看记录'
        unique_together = [('event', 'viewer')]

    def __str__(self):
        return f'{self.viewer.username} 查看了 {self.event}'
