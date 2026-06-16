from django.db import models
from django.contrib.auth.models import User


class Family(models.Model):
    name = models.CharField(max_length=100, verbose_name='家庭名称')
    address = models.CharField(max_length=255, blank=True, verbose_name='家庭地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '家庭'
        verbose_name_plural = '家庭'

    def __str__(self):
        return self.name


class Profile(models.Model):
    RELATION_CHOICES = [
        ('mother', '妈妈'),
        ('father', '爸爸'),
        ('grandma', '奶奶/外婆'),
        ('grandpa', '爷爷/外公'),
        ('other', '其他'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', verbose_name='用户')
    phone = models.CharField(max_length=20, blank=True, verbose_name='手机号')
    relation_with_baby = models.CharField(max_length=20, choices=RELATION_CHOICES, verbose_name='与宝宝关系')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '用户资料'
        verbose_name_plural = '用户资料'

    def __str__(self):
        return f'{self.user.username} - {self.get_relation_with_baby_display()}'


class FamilyMember(models.Model):
    ROLE_CHOICES = [
        ('admin', '管理员'),
        ('member', '成员'),
    ]

    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members', verbose_name='家庭')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='family_memberships', verbose_name='用户')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name='角色')
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name='加入时间')

    class Meta:
        verbose_name = '家庭成员'
        verbose_name_plural = '家庭成员'
        unique_together = [('family', 'user')]

    def __str__(self):
        return f'{self.user.username} - {self.family.name} ({self.get_role_display()})'
