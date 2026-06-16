from django.db import models
from django.contrib.auth.models import User
from babies.models import Baby
from vaccines.models import Vaccine


class Appointment(models.Model):
    APPOINTMENT_TYPE_CHOICES = [
        ('vaccine', '疫苗接种'),
        ('checkup', '体检'),
    ]

    TIME_SLOT_CHOICES = [
        ('morning_1', '上午第一时段'),
        ('morning_2', '上午第二时段'),
        ('morning_3', '上午第三时段'),
        ('afternoon_1', '下午第一时段'),
        ('afternoon_2', '下午第二时段'),
        ('afternoon_3', '下午第三时段'),
    ]

    STATUS_CHOICES = [
        ('pending', '待确认'),
        ('confirmed', '已确认'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='appointments', verbose_name='宝宝')
    vaccine = models.ForeignKey(Vaccine, on_delete=models.SET_NULL, related_name='appointments', blank=True, null=True, verbose_name='疫苗')
    appointment_type = models.CharField(max_length=10, choices=APPOINTMENT_TYPE_CHOICES, verbose_name='预约类型')
    checkup_type = models.CharField(max_length=100, blank=True, verbose_name='体检类型')
    appointment_date = models.DateField(verbose_name='预约日期')
    time_slot = models.CharField(max_length=20, choices=TIME_SLOT_CHOICES, verbose_name='时间段')
    hospital = models.CharField(max_length=255, verbose_name='预约医院')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, verbose_name='预约状态')
    remarks = models.TextField(blank=True, verbose_name='备注')
    reminded_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, verbose_name='提醒人')
    reminded_at = models.DateTimeField(blank=True, null=True, verbose_name='提醒时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '预约'
        verbose_name_plural = '预约'
        ordering = ['-appointment_date', 'time_slot']

    def __str__(self):
        return f'{self.baby.name} - {self.get_appointment_type_display()} - {self.appointment_date}'
