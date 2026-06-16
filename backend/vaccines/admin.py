from django.contrib import admin
from .models import Vaccine, VaccinationSchedule

admin.site.register(Vaccine)
admin.site.register(VaccinationSchedule)
