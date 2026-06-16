from django.db import models
from babies.models import Baby


class Vaccine(models.Model):
    VACCINE_TYPE_CHOICES = [
        ('free', '免费'),
        ('paid', '自费'),
    ]

    ROUTE_CHOICES = [
        ('injection', '注射'),
        ('oral', '口服'),
        ('spray', '喷雾'),
    ]

    name = models.CharField(max_length=100, verbose_name='疫苗名称')
    short_name = models.CharField(max_length=50, verbose_name='疫苗简称')
    vaccine_type = models.CharField(max_length=10, choices=VACCINE_TYPE_CHOICES, verbose_name='疫苗类型')
    applicable_age_months = models.IntegerField(verbose_name='适用月龄')
    dose_number = models.IntegerField(default=1, verbose_name='剂次')
    route = models.CharField(max_length=10, choices=ROUTE_CHOICES, verbose_name='接种途径')
    precautions = models.TextField(blank=True, verbose_name='注意事项')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '疫苗'
        verbose_name_plural = '疫苗'
        ordering = ['applicable_age_months', 'dose_number']

    def __str__(self):
        return f'{self.short_name} 第{self.dose_number}剂'


class VaccinationSchedule(models.Model):
    STATUS_CHOICES = [
        ('pending', '待接种'),
        ('completed', '已接种'),
        ('delayed', '已推迟'),
    ]

    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='vaccination_schedules', verbose_name='宝宝')
    vaccine = models.ForeignKey(Vaccine, on_delete=models.CASCADE, related_name='schedules', verbose_name='疫苗')
    planned_date = models.DateField(verbose_name='计划接种日期')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, verbose_name='接种状态')
    actual_date = models.DateField(blank=True, null=True, verbose_name='实际接种日期')
    vaccination_site = models.CharField(max_length=255, blank=True, verbose_name='接种地点')
    remarks = models.TextField(blank=True, verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '接种计划'
        verbose_name_plural = '接种计划'
        ordering = ['planned_date']

    def __str__(self):
        return f'{self.baby.name} - {self.vaccine.short_name} - {self.planned_date}'
