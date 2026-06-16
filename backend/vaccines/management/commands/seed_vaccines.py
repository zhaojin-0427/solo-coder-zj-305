from django.core.management.base import BaseCommand
from vaccines.models import Vaccine

VACCINES = [
    {"name": "乙肝疫苗", "short_name": "HepB", "vaccine_type": "free", "applicable_age_months": 0, "dose_number": 1, "route": "injection", "precautions": "出生后24小时内接种"},
    {"name": "卡介苗", "short_name": "BCG", "vaccine_type": "free", "applicable_age_months": 0, "dose_number": 1, "route": "injection", "precautions": "出生后尽早接种"},
    {"name": "乙肝疫苗", "short_name": "HepB", "vaccine_type": "free", "applicable_age_months": 1, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "脊灰灭活疫苗", "short_name": "IPV", "vaccine_type": "free", "applicable_age_months": 2, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "百白破疫苗", "short_name": "DTaP", "vaccine_type": "free", "applicable_age_months": 3, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "脊灰减毒疫苗", "short_name": "OPV", "vaccine_type": "free", "applicable_age_months": 3, "dose_number": 2, "route": "oral", "precautions": ""},
    {"name": "百白破疫苗", "short_name": "DTaP", "vaccine_type": "free", "applicable_age_months": 4, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "脊灰减毒疫苗", "short_name": "OPV", "vaccine_type": "free", "applicable_age_months": 4, "dose_number": 3, "route": "oral", "precautions": ""},
    {"name": "乙肝疫苗", "short_name": "HepB", "vaccine_type": "free", "applicable_age_months": 6, "dose_number": 3, "route": "injection", "precautions": ""},
    {"name": "A群流脑多糖疫苗", "short_name": "MPSV-A", "vaccine_type": "free", "applicable_age_months": 6, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "百白破疫苗", "short_name": "DTaP", "vaccine_type": "free", "applicable_age_months": 5, "dose_number": 3, "route": "injection", "precautions": ""},
    {"name": "A群流脑多糖疫苗", "short_name": "MPSV-A", "vaccine_type": "free", "applicable_age_months": 9, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "麻腮风疫苗", "short_name": "MMR", "vaccine_type": "free", "applicable_age_months": 8, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "乙脑减毒疫苗", "short_name": "JE", "vaccine_type": "free", "applicable_age_months": 8, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "麻腮风疫苗", "short_name": "MMR", "vaccine_type": "free", "applicable_age_months": 18, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "百白破疫苗", "short_name": "DTaP", "vaccine_type": "free", "applicable_age_months": 18, "dose_number": 4, "route": "injection", "precautions": ""},
    {"name": "甲肝减毒疫苗", "short_name": "HepA", "vaccine_type": "free", "applicable_age_months": 18, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "乙脑减毒疫苗", "short_name": "JE", "vaccine_type": "free", "applicable_age_months": 24, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "A+C群流脑多糖疫苗", "short_name": "MPSV-AC", "vaccine_type": "free", "applicable_age_months": 36, "dose_number": 1, "route": "injection", "precautions": ""},
    {"name": "脊灰灭活疫苗", "short_name": "IPV", "vaccine_type": "free", "applicable_age_months": 18, "dose_number": 4, "route": "injection", "precautions": ""},
    {"name": "13价肺炎疫苗", "short_name": "PCV13", "vaccine_type": "paid", "applicable_age_months": 2, "dose_number": 1, "route": "injection", "precautions": "自费疫苗，建议2、4、6月龄各一剂"},
    {"name": "13价肺炎疫苗", "short_name": "PCV13", "vaccine_type": "paid", "applicable_age_months": 4, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "13价肺炎疫苗", "short_name": "PCV13", "vaccine_type": "paid", "applicable_age_months": 6, "dose_number": 3, "route": "injection", "precautions": ""},
    {"name": "13价肺炎疫苗", "short_name": "PCV13", "vaccine_type": "paid", "applicable_age_months": 12, "dose_number": 4, "route": "injection", "precautions": "加强针"},
    {"name": "轮状病毒疫苗", "short_name": "RV", "vaccine_type": "paid", "applicable_age_months": 2, "dose_number": 1, "route": "oral", "precautions": "自费疫苗"},
    {"name": "EV71手足口疫苗", "short_name": "EV71", "vaccine_type": "paid", "applicable_age_months": 6, "dose_number": 1, "route": "injection", "precautions": "自费疫苗，建议6-71月龄接种"},
    {"name": "EV71手足口疫苗", "short_name": "EV71", "vaccine_type": "paid", "applicable_age_months": 7, "dose_number": 2, "route": "injection", "precautions": "间隔1个月"},
    {"name": "水痘疫苗", "short_name": "Var", "vaccine_type": "paid", "applicable_age_months": 12, "dose_number": 1, "route": "injection", "precautions": "自费疫苗"},
    {"name": "流感疫苗", "short_name": "Inf", "vaccine_type": "paid", "applicable_age_months": 6, "dose_number": 1, "route": "injection", "precautions": "自费疫苗，每年接种"},
    {"name": " Hib疫苗", "short_name": "Hib", "vaccine_type": "paid", "applicable_age_months": 2, "dose_number": 1, "route": "injection", "precautions": "自费疫苗"},
    {"name": "Hib疫苗", "short_name": "Hib", "vaccine_type": "paid", "applicable_age_months": 4, "dose_number": 2, "route": "injection", "precautions": ""},
    {"name": "Hib疫苗", "short_name": "Hib", "vaccine_type": "paid", "applicable_age_months": 6, "dose_number": 3, "route": "injection", "precautions": ""},
    {"name": "Hib疫苗", "short_name": "Hib", "vaccine_type": "paid", "applicable_age_months": 18, "dose_number": 4, "route": "injection", "precautions": "加强针"},
]


class Command(BaseCommand):
    help = 'Seed vaccine data'

    def handle(self, *args, **options):
        Vaccine.objects.all().delete()
        for v in VACCINES:
            Vaccine.objects.create(**v)
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(VACCINES)} vaccines'))
