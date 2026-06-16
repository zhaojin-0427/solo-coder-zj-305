import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vaccine_platform.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import Family, FamilyMember, Profile
from babies.models import Baby
from vaccines.models import Vaccine, VaccinationSchedule
from appointments.models import Appointment
from reactions.models import Reaction
from checkups.models import Checkup, CheckupRecord
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta

user = User.objects.get(username='admin')
family = Family.objects.create(name='测试家庭', address='北京市朝阳区')
FamilyMember.objects.create(family=family, user=user, role='admin')
Profile.objects.filter(user=user).update(relation_with_baby='mother')

baby1 = Baby.objects.create(
    name='小豆丁', gender='male', birth_date=date(2025, 12, 15),
    birth_weight=3.35, hospital_preference='北京儿童医院',
    vaccination_history={}, family=family
)
baby2 = Baby.objects.create(
    name='小棉花', gender='female', birth_date=date(2025, 9, 1),
    birth_weight=2.98, hospital_preference='北京大学第一医院',
    vaccination_history={}, family=family
)

vaccines = Vaccine.objects.all().order_by('applicable_age_months', 'dose_number')
for baby in [baby1, baby2]:
    for v in vaccines:
        planned = baby.birth_date + relativedelta(months=v.applicable_age_months)
        if planned <= date.today():
            VaccinationSchedule.objects.create(
                baby=baby, vaccine=v, planned_date=planned,
                status='completed', actual_date=planned
            )
        else:
            VaccinationSchedule.objects.create(
                baby=baby, vaccine=v, planned_date=planned, status='pending'
            )

checkups = Checkup.objects.all()
for baby in [baby1, baby2]:
    for c in checkups:
        checkup_date = baby.birth_date + relativedelta(months=c.applicable_age_months)
        if checkup_date <= date.today():
            CheckupRecord.objects.create(
                baby=baby, checkup=c, checkup_date=checkup_date,
                height=round(50 + c.applicable_age_months * 2.5, 2),
                weight=round(3.3 + c.applicable_age_months * 0.7, 2),
                head_circumference=round(34 + c.applicable_age_months * 0.8, 2),
                doctor_advice='发育正常，继续按计划接种',
                next_visit_date=checkup_date + relativedelta(months=3)
            )

for baby in [baby1, baby2]:
    Appointment.objects.create(
        baby=baby, appointment_type='vaccine',
        appointment_date=date.today() + timedelta(days=3),
        time_slot='morning_2', hospital=baby.hospital_preference,
        status='confirmed'
    )
    Appointment.objects.create(
        baby=baby, appointment_type='checkup', checkup_type='常规体检',
        appointment_date=date.today() + timedelta(days=7),
        time_slot='afternoon_1', hospital=baby.hospital_preference,
        status='pending'
    )

completed_schedules = list(VaccinationSchedule.objects.filter(status='completed')[:3])
reaction_types = ['发热', '红肿', '哭闹', '食欲下降', '嗜睡']
for idx, s in enumerate(completed_schedules):
    appt = Appointment.objects.filter(baby=s.baby).first()
    if appt:
        Reaction.objects.create(
            appointment=appt,
            reaction_type=reaction_types[idx % len(reaction_types)],
            severity=['mild', 'moderate', 'mild'][idx % 3],
            occurrence_time=datetime.combine(s.actual_date, datetime.min.time()) + timedelta(hours=4),
            symptoms='接种后出现轻微反应，体温37.5度',
            treatment='物理降温，多喝水',
            doctor_advice='观察48小时，如持续发热请就医',
            next_visit_notes='下次接种前确认身体状况'
        )

print('Demo data created successfully!')
print(f'Babies: {Baby.objects.count()}')
print(f'Schedules: {VaccinationSchedule.objects.count()}')
print(f'Appointments: {Appointment.objects.count()}')
print(f'CheckupRecords: {CheckupRecord.objects.count()}')
print(f'Reactions: {Reaction.objects.count()}')
