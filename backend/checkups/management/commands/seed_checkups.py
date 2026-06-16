from django.core.management.base import BaseCommand
from checkups.models import Checkup

CHECKUPS = [
    {"name": "新生儿筛查", "applicable_age_months": 0, "checkup_items": ["体格检查", "听力筛查", "新生儿疾病筛查", "黄疸检测"]},
    {"name": "满月体检", "applicable_age_months": 1, "checkup_items": ["体格检查", "黄疸检测", "脐带检查", "喂养指导"]},
    {"name": "3月龄体检", "applicable_age_months": 3, "checkup_items": ["体格检查", "听力筛查", "视力检查", "运动发育评估", "营养指导"]},
    {"name": "6月龄体检", "applicable_age_months": 6, "checkup_items": ["体格检查", "血常规", "听力筛查", "智力发育评估", "辅食添加指导", "维生素D评估"]},
    {"name": "8月龄体检", "applicable_age_months": 8, "checkup_items": ["体格检查", "血常规", "运动发育评估", "语言发育评估", "营养指导"]},
    {"name": "12月龄体检", "applicable_age_months": 12, "checkup_items": ["体格检查", "血常规", "听力筛查", "视力筛查", "智力发育评估", "语言发育评估", "营养指导"]},
    {"name": "18月龄体检", "applicable_age_months": 18, "checkup_items": ["体格检查", "血常规", "智力发育评估", "语言发育评估", "运动发育评估", "牙齿检查"]},
    {"name": "24月龄体检", "applicable_age_months": 24, "checkup_items": ["体格检查", "血常规", "听力筛查", "视力筛查", "智力发育评估", "语言发育评估", "牙齿检查", "营养指导"]},
    {"name": "30月龄体检", "applicable_age_months": 30, "checkup_items": ["体格检查", "血常规", "智力发育评估", "语言发育评估", "运动发育评估"]},
    {"name": "36月龄体检", "applicable_age_months": 36, "checkup_items": ["体格检查", "血常规", "听力筛查", "视力筛查", "智力发育评估", "语言发育评估", "牙齿检查", "营养指导"]},
]


class Command(BaseCommand):
    help = 'Seed checkup data'

    def handle(self, *args, **options):
        Checkup.objects.all().delete()
        for c in CHECKUPS:
            Checkup.objects.create(**c)
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(CHECKUPS)} checkups'))
