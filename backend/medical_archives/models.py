from django.db import models
from django.contrib.auth.models import User
from babies.models import Baby
from appointments.models import Appointment
from health_events.models import HealthEvent
from reactions.models import Reaction
from preparation.models import PreparationChecklist
from accounts.models import Family


class ArchiveTag(models.Model):
    name = models.CharField(max_length=50, verbose_name='标签名称')
    color = models.CharField(max_length=20, default='#6C5CE7', verbose_name='标签颜色')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '资料标签'
        verbose_name_plural = '资料标签'
        ordering = ['name']

    def __str__(self):
        return self.name


class MedicalArchive(models.Model):
    ARCHIVE_TYPE_CHOICES = [
        ('vaccine_certificate', '接种凭证'),
        ('checkup_report', '体检报告'),
        ('lab_result', '化验单'),
        ('doctor_advice', '医生建议'),
        ('revisit_note', '复诊单'),
        ('photo', '照片材料'),
        ('preparation_doc', '到院准备材料'),
        ('reaction_record', '反应观察记录'),
        ('other', '其他资料'),
    ]

    SOURCE_TYPE_CHOICES = [
        ('manual', '手动上传'),
        ('appointment', '预约关联'),
        ('health_event', '健康事件关联'),
        ('reaction', '反应观察关联'),
        ('preparation', '到院准备关联'),
        ('vaccination', '接种记录关联'),
    ]

    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('pending_review', '待审核'),
        ('approved', '已归档'),
        ('needs_action', '待处理'),
        ('expired', '已过期'),
        ('archived_obsolete', '已作废'),
    ]

    PERMISSION_CHOICES = [
        ('family_admin', '仅管理员'),
        ('family_all', '全体家庭成员'),
        ('custom', '指定成员'),
    ]

    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='medical_archives', verbose_name='宝宝')
    family = models.ForeignKey(Family, on_delete=models.SET_NULL, related_name='medical_archives', blank=True, null=True, verbose_name='所属家庭')

    title = models.CharField(max_length=255, verbose_name='资料标题')
    archive_type = models.CharField(max_length=30, choices=ARCHIVE_TYPE_CHOICES, verbose_name='资料类型')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default='manual', verbose_name='来源类型')

    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, related_name='medical_archives', blank=True, null=True, verbose_name='关联预约')
    health_event = models.ForeignKey(HealthEvent, on_delete=models.SET_NULL, related_name='medical_archives', blank=True, null=True, verbose_name='关联健康事件')
    reaction = models.ForeignKey(Reaction, on_delete=models.SET_NULL, related_name='medical_archives', blank=True, null=True, verbose_name='关联反应观察')
    preparation_checklist = models.ForeignKey(PreparationChecklist, on_delete=models.SET_NULL, related_name='medical_archives', blank=True, null=True, verbose_name='关联到院准备')

    event_date = models.DateField(verbose_name='事件发生日期')
    description = models.TextField(blank=True, verbose_name='资料描述')
    doctor_name = models.CharField(max_length=100, blank=True, verbose_name='医生姓名')
    hospital = models.CharField(max_length=255, blank=True, verbose_name='医院名称')

    file_url = models.URLField(blank=True, verbose_name='文件URL')
    file_name = models.CharField(max_length=255, blank=True, verbose_name='文件名')
    thumbnail_url = models.URLField(blank=True, verbose_name='缩略图URL')

    tags = models.ManyToManyField(ArchiveTag, related_name='archives', blank=True, verbose_name='标签')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='资料状态')
    expiry_date = models.DateField(blank=True, null=True, verbose_name='到期日期')

    view_permission = models.CharField(max_length=20, choices=PERMISSION_CHOICES, default='family_all', verbose_name='查看权限')
    allowed_viewers = models.ManyToManyField(User, related_name='allowed_archives', blank=True, verbose_name='允许查看的成员')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='created_archives', blank=True, null=True, verbose_name='创建人')
    handled_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='handled_archives', blank=True, null=True, verbose_name='处理人')
    remarks = models.TextField(blank=True, verbose_name='备注')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '就诊资料归档'
        verbose_name_plural = '就诊资料归档'
        ordering = ['-event_date', '-created_at']

    def __str__(self):
        return f'{self.baby.name} - {self.title}'

    def get_age_months_at_event(self):
        if self.baby and self.baby.birth_date and self.event_date:
            months = (self.event_date.year - self.baby.birth_date.year) * 12 + (self.event_date.month - self.baby.birth_date.month)
            if self.event_date.day < self.baby.birth_date.day:
                months -= 1
            return max(0, months)
        return None

    def get_event_month_key(self):
        if self.event_date:
            return f'{self.event_date.year}-{self.event_date.month:02d}'
        return None


class ArchiveView(models.Model):
    archive = models.ForeignKey(MedicalArchive, on_delete=models.CASCADE, related_name='views', verbose_name='资料归档')
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='viewed_archives', verbose_name='查看人')
    viewed_at = models.DateTimeField(auto_now_add=True, verbose_name='查看时间')

    class Meta:
        verbose_name = '资料查看记录'
        verbose_name_plural = '资料查看记录'
        unique_together = [('archive', 'viewer')]

    def __str__(self):
        return f'{self.viewer.username} 查看了 {self.archive}'


class ArchiveStatusLog(models.Model):
    archive = models.ForeignKey(MedicalArchive, on_delete=models.CASCADE, related_name='status_logs', verbose_name='资料归档')
    old_status = models.CharField(max_length=20, verbose_name='旧状态')
    new_status = models.CharField(max_length=20, verbose_name='新状态')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='archive_status_changes', blank=True, null=True, verbose_name='变更人')
    change_reason = models.TextField(blank=True, verbose_name='变更原因')
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='变更时间')

    class Meta:
        verbose_name = '资料状态变更日志'
        verbose_name_plural = '资料状态变更日志'
        ordering = ['-changed_at']

    def __str__(self):
        return f'{self.archive} 状态变更: {self.old_status} -> {self.new_status}'
