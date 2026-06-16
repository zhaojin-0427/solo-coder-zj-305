from django.db import models
from accounts.models import Family


class Baby(models.Model):
    GENDER_CHOICES = [
        ('male', '男'),
        ('female', '女'),
    ]

    name = models.CharField(max_length=50, verbose_name='宝宝姓名')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, verbose_name='性别')
    birth_date = models.DateField(verbose_name='出生日期')
    birth_weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name='出生体重(kg)')
    vaccination_history = models.JSONField(blank=True, default=dict, verbose_name='接种历史')
    hospital_preference = models.CharField(max_length=255, blank=True, verbose_name='偏好医院')
    remarks = models.TextField(blank=True, verbose_name='备注')
    family = models.ForeignKey(Family, on_delete=models.SET_NULL, related_name='babies', blank=True, null=True, verbose_name='所属家庭')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '宝宝'
        verbose_name_plural = '宝宝'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
