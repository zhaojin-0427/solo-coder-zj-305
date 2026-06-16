from django.db import models
from django.contrib.auth.models import User
from appointments.models import Appointment
from babies.models import Baby


class PreparationChecklist(models.Model):
    STATUS_CHOICES = [
        ('not_started', '未开始'),
        ('in_progress', '准备中'),
        ('completed', '已完成'),
        ('verified', '已核验'),
    ]

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='preparation_checklist', verbose_name='预约')
    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='preparation_checklists', verbose_name='宝宝')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='not_started', verbose_name='准备状态')
    completion_rate = models.FloatField(default=0, verbose_name='完成率')
    risk_notes = models.JSONField(blank=True, default=list, verbose_name='风险提示')
    report_generated = models.BooleanField(default=False, verbose_name='已生成报告')
    report_generated_at = models.DateTimeField(blank=True, null=True, verbose_name='报告生成时间')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, verbose_name='创建人')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '到院准备清单'
        verbose_name_plural = '到院准备清单'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.baby.name} - {self.appointment} - 准备清单'

    def recalculate_completion(self):
        items = self.items.all()
        total = items.count()
        if total == 0:
            self.completion_rate = 0
        else:
            confirmed = items.filter(confirmed=True).count()
            self.completion_rate = round(confirmed / total, 4)
        if self.completion_rate == 1.0:
            self.status = 'completed'
        elif self.completion_rate > 0:
            self.status = 'in_progress'
        self.save(update_fields=['completion_rate', 'status', 'updated_at'])


class ChecklistItem(models.Model):
    CATEGORY_CHOICES = [
        ('document', '证件材料'),
        ('vaccine_book', '疫苗本'),
        ('medical_history', '既往病史'),
        ('fasting', '空腹要求'),
        ('companion', '陪同人信息'),
        ('transport', '交通出发时间'),
        ('other', '其他'),
    ]

    checklist = models.ForeignKey(PreparationChecklist, on_delete=models.CASCADE, related_name='items', verbose_name='准备清单')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='分类')
    item_name = models.CharField(max_length=255, verbose_name='项目名称')
    item_description = models.TextField(blank=True, verbose_name='项目说明')
    is_required = models.BooleanField(default=True, verbose_name='必选项')
    confirmed = models.BooleanField(default=False, verbose_name='已确认')
    confirmed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='confirmed_items', verbose_name='确认人')
    confirmed_at = models.DateTimeField(blank=True, null=True, verbose_name='确认时间')
    sort_order = models.IntegerField(default=0, verbose_name='排序')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '清单项'
        verbose_name_plural = '清单项'
        ordering = ['category', 'sort_order']

    def __str__(self):
        return f'{self.checklist} - {self.item_name}'


class ArrivalVerification(models.Model):
    checklist = models.OneToOneField(PreparationChecklist, on_delete=models.CASCADE, related_name='arrival_verification', verbose_name='准备清单')
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, verbose_name='核验人')
    verified_at = models.DateTimeField(blank=True, null=True, verbose_name='核验时间')
    carried_items = models.JSONField(blank=True, default=list, verbose_name='已携带材料')
    missing_items = models.JSONField(blank=True, default=list, verbose_name='临时缺失项')
    supplemented_items = models.JSONField(blank=True, default=list, verbose_name='现场补录项')
    supplement_notes = models.TextField(blank=True, verbose_name='补录说明')
    on_site_notes = models.TextField(blank=True, verbose_name='现场备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '到院核验记录'
        verbose_name_plural = '到院核验记录'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.checklist} - 到院核验'
