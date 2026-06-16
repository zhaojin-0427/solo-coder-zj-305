from django.db import models
from babies.models import Baby


class Checkup(models.Model):
    name = models.CharField(max_length=100, verbose_name='体检项目名称')
    applicable_age_months = models.IntegerField(verbose_name='适用月龄')
    checkup_items = models.JSONField(blank=True, default=list, verbose_name='体检项目')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '体检项目'
        verbose_name_plural = '体检项目'
        ordering = ['applicable_age_months']

    def __str__(self):
        return f'{self.name} ({self.applicable_age_months}月龄)'


class CheckupRecord(models.Model):
    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='checkup_records', verbose_name='宝宝')
    checkup = models.ForeignKey(Checkup, on_delete=models.SET_NULL, related_name='records', blank=True, null=True, verbose_name='体检项目')
    checkup_date = models.DateField(verbose_name='体检日期')
    height = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name='身高(cm)')
    weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name='体重(kg)')
    head_circumference = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name='头围(cm)')
    doctor_advice = models.TextField(blank=True, verbose_name='医生建议')
    next_visit_date = models.DateField(blank=True, null=True, verbose_name='下次就诊日期')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '体检记录'
        verbose_name_plural = '体检记录'
        ordering = ['-checkup_date']

    def __str__(self):
        return f'{self.baby.name} - {self.checkup_date}'
