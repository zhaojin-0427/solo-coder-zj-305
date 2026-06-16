from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import PreparationChecklist, ChecklistItem, ArrivalVerification
from .serializers import (
    PreparationChecklistSerializer,
    ChecklistItemSerializer,
    ArrivalVerificationSerializer,
)
from appointments.models import Appointment
from babies.models import Baby
from vaccines.models import Vaccine, VaccinationSchedule
from checkups.models import Checkup, CheckupRecord


def _calculate_age_months(birth_date, today=None):
    if today is None:
        today = date.today()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    if today.day < birth_date.day:
        months -= 1
    return max(0, months)


DOCUMENT_ITEMS = [
    {'name': '出生医学证明', 'required': True, 'description': '原件或复印件'},
    {'name': '户口本', 'required': True, 'description': '宝宝页及监护人页'},
    {'name': '监护人身份证', 'required': True, 'description': '陪同人身份证原件'},
    {'name': '社保卡/医保卡', 'required': False, 'description': '如有请携带'},
]

VACCINE_BOOK_ITEMS = [
    {'name': '预防接种证（绿本）', 'required': True, 'description': '记录全部接种史'},
    {'name': '上次接种记录页', 'required': True, 'description': '确认上次接种日期和疫苗'},
]

MEDICAL_HISTORY_ITEMS = [
    {'name': '既往病史记录', 'required': True, 'description': '过敏史、慢性病等'},
    {'name': '药物过敏记录', 'required': True, 'description': '如有药物过敏务必携带'},
    {'name': '近期用药清单', 'required': False, 'description': '如正在服药需告知医生'},
]

FASTING_ITEMS_VACCINE = [
    {'name': '确认接种前饮食要求', 'required': True, 'description': '一般正常饮食即可，无需空腹'},
]

FASTING_ITEMS_CHECKUP = [
    {'name': '确认体检前是否需要空腹', 'required': True, 'description': '部分体检项目需空腹8小时以上'},
    {'name': '准备空腹食物（如需）', 'required': False, 'description': '体检后可立即进食'},
]

COMPANION_ITEMS = [
    {'name': '确认陪同人', 'required': True, 'description': '至少一位监护人陪同'},
    {'name': '陪同人身份证', 'required': True, 'description': '办理手续需出示'},
    {'name': '备用陪同人联系方式', 'required': False, 'description': '紧急情况联系'},
]

TRANSPORT_ITEMS = [
    {'name': '确认出发时间', 'required': True, 'description': '建议提前30分钟到达'},
    {'name': '确认交通方式', 'required': True, 'description': '自驾/公交/地铁'},
    {'name': '规划路线', 'required': False, 'description': '预留充足通勤时间'},
]

AGE_SPECIFIC_ITEMS = {
    (0, 6): [
        {'category': 'other', 'name': '奶瓶/母乳准备', 'required': True, 'description': '婴儿可能需要喂奶安抚'},
        {'category': 'other', 'name': '尿布/湿巾', 'required': True, 'description': '更换尿布用'},
        {'category': 'other', 'name': '婴儿推车或背带', 'required': False, 'description': '方便携带婴儿'},
    ],
    (6, 12): [
        {'category': 'other', 'name': '辅食/零食', 'required': False, 'description': '安抚婴儿情绪'},
        {'category': 'other', 'name': '喜爱的玩具', 'required': False, 'description': '缓解紧张情绪'},
        {'category': 'other', 'name': '尿布/湿巾', 'required': True, 'description': '更换用'},
    ],
    (12, 36): [
        {'category': 'other', 'name': '零食/水壶', 'required': False, 'description': '等待时可能需要'},
        {'category': 'other', 'name': '喜爱的玩具/绘本', 'required': False, 'description': '安抚等待时情绪'},
    ],
    (36, 999): [
        {'category': 'other', 'name': '安抚物品', 'required': False, 'description': '减少儿童紧张'},
    ],
}


def _get_age_specific_items(age_months):
    items = []
    for (min_m, max_m), age_items in AGE_SPECIFIC_ITEMS.items():
        if min_m <= age_months < max_m:
            items.extend(age_items)
    return items


def _generate_checklist_items(checklist, appointment, baby):
    age_months = _calculate_age_months(baby.birth_date, appointment.appointment_date)
    apt_type = appointment.appointment_type
    items_to_create = []
    order = 0

    for doc in DOCUMENT_ITEMS:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category='document',
            item_name=doc['name'], item_description=doc['description'],
            is_required=doc['required'], sort_order=order,
        ))
        order += 1

    for vb in VACCINE_BOOK_ITEMS:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category='vaccine_book',
            item_name=vb['name'], item_description=vb['description'],
            is_required=vb['required'], sort_order=order,
        ))
        order += 1

    for mh in MEDICAL_HISTORY_ITEMS:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category='medical_history',
            item_name=mh['name'], item_description=mh['description'],
            is_required=mh['required'], sort_order=order,
        ))
        order += 1

    fasting_items = FASTING_ITEMS_CHECKUP if apt_type == 'checkup' else FASTING_ITEMS_VACCINE
    for fi in fasting_items:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category='fasting',
            item_name=fi['name'], item_description=fi['description'],
            is_required=fi['required'], sort_order=order,
        ))
        order += 1

    for ci in COMPANION_ITEMS:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category='companion',
            item_name=ci['name'], item_description=ci['description'],
            is_required=ci['required'], sort_order=order,
        ))
        order += 1

    for ti in TRANSPORT_ITEMS:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category='transport',
            item_name=ti['name'], item_description=ti['description'],
            is_required=ti['required'], sort_order=order,
        ))
        order += 1

    age_items = _get_age_specific_items(age_months)
    for ai in age_items:
        items_to_create.append(ChecklistItem(
            checklist=checklist, category=ai.get('category', 'other'),
            item_name=ai['name'], item_description=ai['description'],
            is_required=ai.get('required', False), sort_order=order,
        ))
        order += 1

    ChecklistItem.objects.bulk_create(items_to_create)


def _generate_risk_notes(checklist, appointment, baby):
    risks = []
    age_months = _calculate_age_months(baby.birth_date, appointment.appointment_date)

    if appointment.appointment_type == 'vaccine' and appointment.vaccine:
        vaccine = appointment.vaccine
        if vaccine.precautions:
            risks.append({
                'type': 'vaccine_precaution',
                'level': 'warning',
                'message': f'疫苗注意事项: {vaccine.precautions}',
            })
        recent_reactions = appointment.vaccine.appointments.filter(
            baby=baby,
        ).exclude(pk=appointment.pk).exists()
        if recent_reactions:
            risks.append({
                'type': 'history_reaction',
                'level': 'warning',
                'message': f'该宝宝曾接种过 {vaccine.short_name}，请注意确认是否为同剂次',
            })

    if appointment.appointment_type == 'checkup':
        if age_months <= 6:
            risks.append({
                'type': 'age_reminder',
                'level': 'info',
                'message': '宝宝月龄较小，体检时请特别注意保暖和安抚',
            })

    if age_months < 12:
        risks.append({
            'type': 'age_specific',
            'level': 'info',
            'message': '婴儿接种后需在现场观察30分钟，请预留充足时间',
        })

    appointment_date = appointment.appointment_date
    today = date.today()
    days_until = (appointment_date - today).days
    if days_until <= 1 and days_until >= 0:
        risks.append({
            'type': 'urgent',
            'level': 'warning',
            'message': f'预约即将到来（{days_until}天内），请尽快完成准备',
        })

    if baby.vaccination_history and isinstance(baby.vaccination_history, dict):
        allergy_info = baby.vaccination_history.get('allergies')
        if allergy_info:
            risks.append({
                'type': 'allergy',
                'level': 'danger',
                'message': f'宝宝有过敏记录: {allergy_info}，请务必告知医生',
            })

    checklist.risk_notes = risks
    checklist.save(update_fields=['risk_notes'])


class PreparationChecklistViewSet(viewsets.ModelViewSet):
    queryset = PreparationChecklist.objects.select_related('appointment', 'baby', 'created_by').prefetch_related('items').all()
    serializer_class = PreparationChecklistSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['baby', 'appointment', 'status']

    @action(detail=False, methods=['post'])
    def generate(self, request):
        appointment_id = request.data.get('appointment_id')
        if not appointment_id:
            return Response({'detail': '请指定预约ID'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.select_related('baby', 'vaccine').get(pk=appointment_id)
        except Appointment.DoesNotExist:
            return Response({'detail': '未找到预约'}, status=status.HTTP_404_NOT_FOUND)

        if appointment.status == 'cancelled':
            return Response({'detail': '已取消的预约无法生成准备清单'}, status=status.HTTP_400_BAD_REQUEST)

        existing = PreparationChecklist.objects.filter(appointment=appointment).first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response({'detail': '该预约已有准备清单', 'checklist': serializer.data})

        user_id = request.data.get('user_id')
        created_by = None
        if user_id:
            try:
                created_by = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                pass

        checklist = PreparationChecklist.objects.create(
            appointment=appointment,
            baby=appointment.baby,
            created_by=created_by,
        )

        _generate_checklist_items(checklist, appointment, appointment.baby)
        _generate_risk_notes(checklist, appointment, appointment.baby)
        checklist.recalculate_completion()

        serializer = self.get_serializer(checklist)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm_item(self, request, pk=None):
        checklist = self.get_object()
        item_id = request.data.get('item_id')
        confirmed = request.data.get('confirmed', True)

        try:
            item = checklist.items.get(pk=item_id)
        except ChecklistItem.DoesNotExist:
            return Response({'detail': '未找到该清单项'}, status=status.HTTP_404_NOT_FOUND)

        user_id = request.data.get('user_id')
        confirmed_by = None
        if user_id:
            try:
                confirmed_by = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                pass

        item.confirmed = confirmed
        item.confirmed_by = confirmed_by
        item.confirmed_at = datetime.now() if confirmed else None
        item.save()

        checklist.recalculate_completion()

        item_serializer = ChecklistItemSerializer(item)
        return Response({
            'item': item_serializer.data,
            'completion_rate': checklist.completion_rate,
            'status': checklist.status,
        })

    @action(detail=True, methods=['post'])
    def batch_confirm(self, request, pk=None):
        checklist = self.get_object()
        item_ids = request.data.get('item_ids', [])
        confirmed = request.data.get('confirmed', True)
        user_id = request.data.get('user_id')
        confirmed_by = None
        if user_id:
            try:
                confirmed_by = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                pass

        updated = []
        now = datetime.now() if confirmed else None
        for item_id in item_ids:
            try:
                item = checklist.items.get(pk=item_id)
                item.confirmed = confirmed
                item.confirmed_by = confirmed_by
                item.confirmed_at = now
                item.save()
                updated.append(ChecklistItemSerializer(item).data)
            except ChecklistItem.DoesNotExist:
                pass

        checklist.recalculate_completion()
        return Response({
            'updated_items': updated,
            'completion_rate': checklist.completion_rate,
            'status': checklist.status,
        })

    @action(detail=True, methods=['post'])
    def generate_report(self, request, pk=None):
        checklist = self.get_object()
        if checklist.report_generated:
            return Response({'detail': '报告已生成过', 'report_generated_at': checklist.report_generated_at})

        checklist.report_generated = True
        checklist.report_generated_at = datetime.now()
        checklist.save(update_fields=['report_generated', 'report_generated_at'])

        items = checklist.items.all()
        confirmed_items = [ChecklistItemSerializer(i).data for i in items if i.confirmed]
        unconfirmed_items = [ChecklistItemSerializer(i).data for i in items if not i.confirmed]
        required_unconfirmed = [ChecklistItemSerializer(i).data for i in items if not i.confirmed and i.is_required]

        report = {
            'checklist_id': checklist.id,
            'baby_name': checklist.baby.name,
            'appointment_info': {
                'type': checklist.appointment.get_appointment_type_display(),
                'date': str(checklist.appointment.appointment_date),
                'time_slot': checklist.appointment.get_time_slot_display(),
                'hospital': checklist.appointment.hospital,
                'vaccine_name': checklist.appointment.vaccine.short_name if checklist.appointment.vaccine else None,
                'checkup_type': checklist.appointment.checkup_type or None,
            },
            'completion_rate': checklist.completion_rate,
            'status': checklist.status,
            'status_label': checklist.get_status_display(),
            'confirmed_items': confirmed_items,
            'unconfirmed_items': unconfirmed_items,
            'required_unconfirmed': required_unconfirmed,
            'risk_notes': checklist.risk_notes,
            'report_generated_at': checklist.report_generated_at,
            'has_verification': ArrivalVerification.objects.filter(checklist=checklist).exists(),
        }

        return Response(report)

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        checklist = self.get_object()
        if not checklist.report_generated:
            return Response({'detail': '报告尚未生成'}, status=status.HTTP_404_NOT_FOUND)

        items = checklist.items.all()
        confirmed_items = [ChecklistItemSerializer(i).data for i in items if i.confirmed]
        unconfirmed_items = [ChecklistItemSerializer(i).data for i in items if not i.confirmed]
        required_unconfirmed = [ChecklistItemSerializer(i).data for i in items if not i.confirmed and i.is_required]

        report = {
            'checklist_id': checklist.id,
            'baby_name': checklist.baby.name,
            'appointment_info': {
                'type': checklist.appointment.get_appointment_type_display(),
                'date': str(checklist.appointment.appointment_date),
                'time_slot': checklist.appointment.get_time_slot_display(),
                'hospital': checklist.appointment.hospital,
                'vaccine_name': checklist.appointment.vaccine.short_name if checklist.appointment.vaccine else None,
                'checkup_type': checklist.appointment.checkup_type or None,
            },
            'completion_rate': checklist.completion_rate,
            'status': checklist.status,
            'status_label': checklist.get_status_display(),
            'confirmed_items': confirmed_items,
            'unconfirmed_items': unconfirmed_items,
            'required_unconfirmed': required_unconfirmed,
            'risk_notes': checklist.risk_notes,
            'report_generated_at': checklist.report_generated_at,
        }

        try:
            verification = checklist.arrival_verification
            report['verification'] = ArrivalVerificationSerializer(verification).data
        except ArrivalVerification.DoesNotExist:
            report['verification'] = None

        return Response(report)

    @action(detail=False, methods=['get'])
    def by_appointment(self, request):
        appointment_id = request.query_params.get('appointment_id')
        if not appointment_id:
            return Response({'detail': '请指定预约ID'}, status=status.HTTP_400_BAD_REQUEST)

        checklist = PreparationChecklist.objects.filter(appointment_id=appointment_id).first()
        if not checklist:
            return Response({'detail': '该预约暂无准备清单', 'exists': False})

        serializer = self.get_serializer(checklist)
        return Response({'exists': True, 'checklist': serializer.data})

    @action(detail=False, methods=['get'])
    def by_baby(self, request):
        baby_id = request.query_params.get('baby_id')
        if not baby_id:
            return Response({'detail': '请指定宝宝ID'}, status=status.HTTP_400_BAD_REQUEST)

        checklists = PreparationChecklist.objects.filter(baby_id=baby_id).order_by('-created_at')
        serializer = self.get_serializer(checklists, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        baby_id = request.query_params.get('baby_id')
        family_id = request.query_params.get('family_id')

        checklists_qs = PreparationChecklist.objects.all()
        if baby_id:
            checklists_qs = checklists_qs.filter(baby_id=baby_id)
        elif family_id:
            baby_ids = Baby.objects.filter(family_id=family_id).values_list('pk', flat=True)
            checklists_qs = checklists_qs.filter(baby_id__in=baby_ids)

        total = checklists_qs.count()
        not_started = checklists_qs.filter(status='not_started').count()
        in_progress = checklists_qs.filter(status='in_progress').count()
        completed = checklists_qs.filter(status='completed').count()
        verified = checklists_qs.filter(status='verified').count()
        reports_generated = checklists_qs.filter(report_generated=True).count()

        verifications_qs = ArrivalVerification.objects.filter(checklist__in=checklists_qs)
        total_verifications = verifications_qs.count()
        total_missing = sum(len(v.missing_items) for v in verifications_qs)
        total_supplemented = sum(len(v.supplemented_items) for v in verifications_qs)

        avg_completion = 0
        if total > 0:
            avg_completion = round(sum(c.completion_rate for c in checklists_qs) / total, 4)

        by_category_stats = {}
        all_items = ChecklistItem.objects.filter(checklist__in=checklists_qs)
        for item in all_items:
            cat = item.category
            if cat not in by_category_stats:
                by_category_stats[cat] = {'total': 0, 'confirmed': 0, 'required': 0, 'required_confirmed': 0}
            by_category_stats[cat]['total'] += 1
            if item.confirmed:
                by_category_stats[cat]['confirmed'] += 1
            if item.is_required:
                by_category_stats[cat]['required'] += 1
                if item.confirmed:
                    by_category_stats[cat]['required_confirmed'] += 1

        return Response({
            'total_checklists': total,
            'status_distribution': {
                'not_started': not_started,
                'in_progress': in_progress,
                'completed': completed,
                'verified': verified,
            },
            'reports_generated': reports_generated,
            'avg_completion_rate': avg_completion,
            'verification_stats': {
                'total_verifications': total_verifications,
                'total_missing_items': total_missing,
                'total_supplemented_items': total_supplemented,
            },
            'by_category': by_category_stats,
        })


class ArrivalVerificationViewSet(viewsets.ModelViewSet):
    queryset = ArrivalVerification.objects.select_related('checklist', 'verified_by').all()
    serializer_class = ArrivalVerificationSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def create_verification(self, request):
        checklist_id = request.data.get('checklist_id')
        if not checklist_id:
            return Response({'detail': '请指定准备清单ID'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            checklist = PreparationChecklist.objects.get(pk=checklist_id)
        except PreparationChecklist.DoesNotExist:
            return Response({'detail': '未找到准备清单'}, status=status.HTTP_404_NOT_FOUND)

        if ArrivalVerification.objects.filter(checklist=checklist).exists():
            return Response({'detail': '该清单已有到院核验记录'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.data.get('user_id')
        verified_by = None
        if user_id:
            try:
                verified_by = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                pass

        carried_items = request.data.get('carried_items', [])
        missing_items = request.data.get('missing_items', [])
        supplemented_items = request.data.get('supplemented_items', [])
        supplement_notes = request.data.get('supplement_notes', '')
        on_site_notes = request.data.get('on_site_notes', '')

        verification = ArrivalVerification.objects.create(
            checklist=checklist,
            verified_by=verified_by,
            verified_at=datetime.now(),
            carried_items=carried_items,
            missing_items=missing_items,
            supplemented_items=supplemented_items,
            supplement_notes=supplement_notes,
            on_site_notes=on_site_notes,
        )

        checklist.status = 'verified'
        checklist.save(update_fields=['status', 'updated_at'])

        serializer = self.get_serializer(verification)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def update_verification(self, request, pk=None):
        verification = self.get_object()

        if 'carried_items' in request.data:
            verification.carried_items = request.data['carried_items']
        if 'missing_items' in request.data:
            verification.missing_items = request.data['missing_items']
        if 'supplemented_items' in request.data:
            verification.supplemented_items = request.data['supplemented_items']
        if 'supplement_notes' in request.data:
            verification.supplement_notes = request.data['supplement_notes']
        if 'on_site_notes' in request.data:
            verification.on_site_notes = request.data['on_site_notes']

        verification.save()
        serializer = self.get_serializer(verification)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_supplement(self, request, pk=None):
        verification = self.get_object()
        item_name = request.data.get('item_name')
        if not item_name:
            return Response({'detail': '请提供补录项名称'}, status=status.HTTP_400_BAD_REQUEST)

        supplemented = list(verification.supplemented_items)
        supplemented.append({
            'item_name': item_name,
            'description': request.data.get('description', ''),
            'supplemented_at': datetime.now().isoformat(),
        })
        verification.supplemented_items = supplemented
        verification.save()

        serializer = self.get_serializer(verification)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_missing(self, request, pk=None):
        verification = self.get_object()
        item_name = request.data.get('item_name')
        if not item_name:
            return Response({'detail': '请提供缺失项名称'}, status=status.HTTP_400_BAD_REQUEST)

        missing = list(verification.missing_items)
        missing.append({
            'item_name': item_name,
            'description': request.data.get('description', ''),
            'is_resolved': False,
        })
        verification.missing_items = missing
        verification.save()

        serializer = self.get_serializer(verification)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_appointment(self, request):
        appointment_id = request.query_params.get('appointment_id')
        if not appointment_id:
            return Response({'detail': '请指定预约ID'}, status=status.HTTP_400_BAD_REQUEST)

        checklist = PreparationChecklist.objects.filter(appointment_id=appointment_id).first()
        if not checklist:
            return Response({'detail': '该预约暂无准备清单'}, status=status.HTTP_404_NOT_FOUND)

        verification = ArrivalVerification.objects.filter(checklist=checklist).first()
        if not verification:
            return Response({'detail': '该清单暂无到院核验记录', 'exists': False})

        serializer = self.get_serializer(verification)
        return Response({'exists': True, 'verification': serializer.data})
