import uuid
from datetime import date

import pytest
from django.utils import timezone

from apps.matters.models import Case, CaseParty, CaseDate, CaseActivityLog


LAWYER_ID = uuid.uuid4()
CLIENT_ID = uuid.uuid4()
USER_ID = uuid.uuid4()


def make_case(**kwargs):
    defaults = dict(
        case_number="EXP-TEST-001",
        title="Caso de prueba",
        case_type=Case.CaseType.CIVIL,
        status=Case.CaseStatus.OPEN,
        assigned_lawyer_id=LAWYER_ID,
        client_id=CLIENT_ID,
        opened_at=date.today(),
        created_by=USER_ID,
    )
    defaults.update(kwargs)
    return Case.objects.create(**defaults)


@pytest.mark.django_db
class TestCaseModel:
    def test_create_case(self):
        case = make_case()
        assert case.pk is not None
        assert case.status == Case.CaseStatus.OPEN
        assert case.case_type == Case.CaseType.CIVIL

    def test_case_str(self):
        case = make_case()
        assert "EXP-TEST-001" in str(case)
        assert "Caso de prueba" in str(case)

    def test_case_number_unique(self):
        make_case(case_number="EXP-UNIQUE-001")
        with pytest.raises(Exception):
            make_case(case_number="EXP-UNIQUE-001")

    def test_case_uuid_primary_key(self):
        case = make_case()
        assert isinstance(case.id, uuid.UUID)

    def test_case_status_choices(self):
        case = make_case(status=Case.CaseStatus.IN_PROGRESS)
        assert case.status == "in_progress"
        case.status = Case.CaseStatus.CLOSED
        case.closed_at = date.today()
        case.save()
        case.refresh_from_db()
        assert case.status == "closed"
        assert case.closed_at is not None

    def test_case_urgent_flag(self):
        case = make_case(is_urgent=True, case_number="EXP-URGENT-001")
        assert case.is_urgent is True

    def test_case_tags(self):
        case = make_case(tags=["civil", "urgente", "contrato"], case_number="EXP-TAGS-001")
        case.refresh_from_db()
        assert "civil" in case.tags
        assert len(case.tags) == 3

    def test_case_ordering(self):
        case1 = make_case(case_number="EXP-ORDER-001")
        case2 = make_case(case_number="EXP-ORDER-002")
        cases = list(Case.objects.all())
        # Ordenación por -created_at: el más reciente primero
        assert cases[0].id == case2.id


@pytest.mark.django_db
class TestCasePartyModel:
    def test_create_party(self):
        case = make_case()
        party = CaseParty.objects.create(
            case=case,
            full_name="Juan Pérez",
            role=CaseParty.PartyRole.CLIENT,
            email="juan@email.com",
            phone="+34 600 000 001",
            identification="11111111A",
        )
        assert party.pk is not None
        assert party.case == case
        assert party.role == "client"

    def test_party_str(self):
        case = make_case()
        party = CaseParty.objects.create(
            case=case,
            full_name="Ana García",
            role=CaseParty.PartyRole.OPPOSING_PARTY,
        )
        assert "Ana García" in str(party)
        assert "EXP-TEST-001" in str(party)

    def test_multiple_parties_per_case(self):
        case = make_case()
        for i, role in enumerate(["client", "opposing_party", "expert"]):
            CaseParty.objects.create(
                case=case,
                full_name=f"Persona {i}",
                role=role,
            )
        assert case.parties.count() == 3

    def test_party_deleted_with_case(self):
        case = make_case()
        CaseParty.objects.create(case=case, full_name="Test", role="other")
        case_id = case.id
        case.delete()
        assert CaseParty.objects.filter(case_id=case_id).count() == 0


@pytest.mark.django_db
class TestCaseDateModel:
    def test_create_date(self):
        case = make_case()
        case_date = CaseDate.objects.create(
            case=case,
            title="Audiencia preliminar",
            date_type=CaseDate.DateType.HEARING,
            scheduled_date=timezone.now() + timezone.timedelta(days=10),
            is_critical=True,
            created_by=USER_ID,
        )
        assert case_date.pk is not None
        assert case_date.is_critical is True
        assert case_date.is_completed is False

    def test_date_str(self):
        case = make_case()
        future = timezone.now() + timezone.timedelta(days=15)
        case_date = CaseDate.objects.create(
            case=case,
            title="Juicio oral",
            date_type=CaseDate.DateType.TRIAL,
            scheduled_date=future,
            created_by=USER_ID,
        )
        assert "Juicio oral" in str(case_date)
        assert "EXP-TEST-001" in str(case_date)

    def test_complete_date(self):
        case = make_case()
        case_date = CaseDate.objects.create(
            case=case,
            title="Plazo recurso",
            date_type=CaseDate.DateType.DEADLINE,
            scheduled_date=timezone.now() + timezone.timedelta(days=5),
            created_by=USER_ID,
        )
        case_date.is_completed = True
        case_date.completed_at = timezone.now()
        case_date.save()
        case_date.refresh_from_db()
        assert case_date.is_completed is True
        assert case_date.completed_at is not None

    def test_dates_deleted_with_case(self):
        case = make_case()
        CaseDate.objects.create(
            case=case,
            title="Fecha test",
            date_type="other",
            scheduled_date=timezone.now() + timezone.timedelta(days=1),
            created_by=USER_ID,
        )
        case_id = case.id
        case.delete()
        assert CaseDate.objects.filter(case_id=case_id).count() == 0


@pytest.mark.django_db
class TestCaseActivityLogModel:
    def test_create_activity_log(self):
        case = make_case()
        log = CaseActivityLog.objects.create(
            case=case,
            activity_type=CaseActivityLog.ActivityType.CREATED,
            user_id=USER_ID,
            description="Caso creado en test",
        )
        assert log.pk is not None
        assert log.activity_type == "created"

    def test_log_with_old_and_new_value(self):
        case = make_case()
        log = CaseActivityLog.objects.create(
            case=case,
            activity_type=CaseActivityLog.ActivityType.STATUS_CHANGED,
            user_id=USER_ID,
            description="Estado cambiado",
            old_value={"status": "open"},
            new_value={"status": "in_progress"},
        )
        assert log.old_value["status"] == "open"
        assert log.new_value["status"] == "in_progress"

    def test_activity_log_ordering(self):
        case = make_case()
        log1 = CaseActivityLog.objects.create(
            case=case,
            activity_type="created",
            user_id=USER_ID,
            description="Primero",
        )
        log2 = CaseActivityLog.objects.create(
            case=case,
            activity_type="updated",
            user_id=USER_ID,
            description="Segundo",
        )
        logs = list(case.activity_logs.all())
        # Ordenado por -timestamp: el más reciente primero
        assert logs[0].id == log2.id
