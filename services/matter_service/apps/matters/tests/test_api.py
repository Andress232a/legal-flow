import uuid
from datetime import date
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone

from apps.matters.models import Case, CaseParty, CaseDate, CaseActivityLog


LAWYER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
CLIENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testuser",
        password="TestPass123!",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def sample_case(db):
    return Case.objects.create(
        case_number="EXP-API-001",
        title="Caso API de prueba",
        case_type=Case.CaseType.CIVIL,
        status=Case.CaseStatus.OPEN,
        assigned_lawyer_id=LAWYER_ID,
        client_id=CLIENT_ID,
        opened_at=date.today(),
        created_by=LAWYER_ID,
    )


# ─── Permisos permitidos (mock IAM = True) ─────────────────────────────────────

@pytest.mark.django_db
class TestCaseListEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_list_cases_allowed(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.get("/api/cases/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    @patch("apps.matters.api.views.check_permission", return_value=False)
    def test_list_cases_forbidden(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.get("/api/cases/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_cases_unauthenticated(self, api_client, sample_case):
        response = api_client.get("/api/cases/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCaseCreateEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_create_case_success(self, mock_event, mock_perm, authenticated_client):
        data = {
            "case_number": "EXP-NEW-001",
            "title": "Nuevo caso civil",
            "case_type": "civil",
            "status": "open",
            "assigned_lawyer_id": str(LAWYER_ID),
            "client_id": str(CLIENT_ID),
            "opened_at": "2024-01-15",
            "is_urgent": False,
        }
        response = authenticated_client.post("/api/cases/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["case_number"] == "EXP-NEW-001"
        assert response.data["title"] == "Nuevo caso civil"
        # Verificar que se publicó el evento
        mock_event.assert_called_once()
        assert mock_event.call_args[0][0] == "case.created"

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_create_case_duplicate_number(self, mock_perm, authenticated_client, sample_case):
        data = {
            "case_number": "EXP-API-001",  # Ya existe
            "title": "Duplicado",
            "case_type": "civil",
            "assigned_lawyer_id": str(LAWYER_ID),
            "client_id": str(CLIENT_ID),
            "opened_at": "2024-01-15",
        }
        response = authenticated_client.post("/api/cases/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("apps.matters.api.views.check_permission", return_value=False)
    def test_create_case_forbidden(self, mock_perm, authenticated_client):
        data = {
            "case_number": "EXP-FORBIDDEN-001",
            "title": "No debería crearse",
            "case_type": "civil",
            "assigned_lawyer_id": str(LAWYER_ID),
            "client_id": str(CLIENT_ID),
            "opened_at": "2024-01-15",
        }
        response = authenticated_client.post("/api/cases/", data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_create_case_creates_activity_log(self, mock_event, mock_perm, authenticated_client):
        data = {
            "case_number": "EXP-LOG-001",
            "title": "Caso con log",
            "case_type": "labor",
            "assigned_lawyer_id": str(LAWYER_ID),
            "client_id": str(CLIENT_ID),
            "opened_at": "2024-01-15",
        }
        response = authenticated_client.post("/api/cases/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        case_id = response.data["id"]
        logs = CaseActivityLog.objects.filter(case_id=case_id)
        assert logs.count() == 1
        assert logs.first().activity_type == "created"


@pytest.mark.django_db
class TestCaseRetrieveEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_retrieve_case(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.get(f"/api/cases/{sample_case.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["case_number"] == "EXP-API-001"
        assert "parties" in response.data
        assert "dates" in response.data

    @patch("apps.matters.api.views.check_permission", return_value=False)
    def test_retrieve_case_forbidden(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.get(f"/api/cases/{sample_case.id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_retrieve_nonexistent_case(self, mock_perm, authenticated_client):
        fake_id = uuid.uuid4()
        response = authenticated_client.get(f"/api/cases/{fake_id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCaseUpdateEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_update_case_title(self, mock_event, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.patch(
            f"/api/cases/{sample_case.id}/",
            {"title": "Título actualizado"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Título actualizado"

    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_update_case_status_triggers_event(self, mock_event, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.patch(
            f"/api/cases/{sample_case.id}/",
            {"status": "in_progress"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        # Verificar evento de cambio de estado
        event_names = [call[0][0] for call in mock_event.call_args_list]
        assert "case.status_changed" in event_names

    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_close_case_sets_closed_at(self, mock_event, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.patch(
            f"/api/cases/{sample_case.id}/",
            {"status": "closed"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        sample_case.refresh_from_db()
        assert sample_case.closed_at is not None
        event_names = [call[0][0] for call in mock_event.call_args_list]
        assert "case.closed" in event_names


@pytest.mark.django_db
class TestCaseDeleteEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_delete_case(self, mock_event, mock_perm, authenticated_client, sample_case):
        case_id = sample_case.id
        response = authenticated_client.delete(f"/api/cases/{case_id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Case.objects.filter(id=case_id).exists()

    @patch("apps.matters.api.views.check_permission", return_value=False)
    def test_delete_case_forbidden(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.delete(f"/api/cases/{sample_case.id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Case.objects.filter(id=sample_case.id).exists()


@pytest.mark.django_db
class TestCaseStatusChangeEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_change_status(self, mock_event, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.post(
            f"/api/cases/{sample_case.id}/change-status/",
            {"status": "in_appeal", "notes": "Se presenta recurso ante el tribunal superior"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "in_appeal"

    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_change_to_closed_sets_date(self, mock_event, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.post(
            f"/api/cases/{sample_case.id}/change-status/",
            {"status": "closed"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        sample_case.refresh_from_db()
        assert sample_case.closed_at is not None

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_change_status_invalid(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.post(
            f"/api/cases/{sample_case.id}/change-status/",
            {"status": "invalid_status"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCasePartiesEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_add_party(self, mock_event, mock_perm, authenticated_client, sample_case):
        data = {
            "full_name": "Carlos López",
            "role": "client",
            "email": "carlos@email.com",
            "phone": "+34 611 222 333",
            "identification": "22222222B",
        }
        response = authenticated_client.post(
            f"/api/cases/{sample_case.id}/add-party/",
            data, format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["full_name"] == "Carlos López"
        assert sample_case.parties.count() == 1

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_list_parties(self, mock_perm, authenticated_client, sample_case):
        CaseParty.objects.create(
            case=sample_case,
            full_name="Isabel Navarro",
            role="opposing_party",
        )
        response = authenticated_client.get(f"/api/cases/{sample_case.id}/parties/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_remove_party(self, mock_event, mock_perm, authenticated_client, sample_case):
        party = CaseParty.objects.create(
            case=sample_case,
            full_name="Parte a eliminar",
            role="other",
        )
        response = authenticated_client.delete(
            f"/api/cases/{sample_case.id}/remove-party/{party.id}/"
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not CaseParty.objects.filter(id=party.id).exists()

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_remove_nonexistent_party(self, mock_perm, authenticated_client, sample_case):
        fake_id = uuid.uuid4()
        response = authenticated_client.delete(
            f"/api/cases/{sample_case.id}/remove-party/{fake_id}/"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCaseDatesEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    @patch("apps.matters.api.views.publish_event")
    def test_add_date(self, mock_event, mock_perm, authenticated_client, sample_case):
        future = (timezone.now() + timezone.timedelta(days=20)).isoformat()
        data = {
            "title": "Juicio oral",
            "date_type": "trial",
            "scheduled_date": future,
            "is_critical": True,
            "notes": "Preparar testimonio de testigos",
        }
        response = authenticated_client.post(
            f"/api/cases/{sample_case.id}/add-date/",
            data, format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Juicio oral"
        assert response.data["is_critical"] is True

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_list_dates(self, mock_perm, authenticated_client, sample_case):
        CaseDate.objects.create(
            case=sample_case,
            title="Audiencia",
            date_type="hearing",
            scheduled_date=timezone.now() + timezone.timedelta(days=10),
            created_by=LAWYER_ID,
        )
        response = authenticated_client.get(f"/api/cases/{sample_case.id}/dates/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_complete_date(self, mock_perm, authenticated_client, sample_case):
        case_date = CaseDate.objects.create(
            case=sample_case,
            title="Plazo a completar",
            date_type="deadline",
            scheduled_date=timezone.now() + timezone.timedelta(days=3),
            created_by=LAWYER_ID,
        )
        response = authenticated_client.post(
            f"/api/cases/{sample_case.id}/complete-date/{case_date.id}/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_completed"] is True
        case_date.refresh_from_db()
        assert case_date.is_completed is True
        assert case_date.completed_at is not None


@pytest.mark.django_db
class TestCaseActivityLogEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_activity_log_empty(self, mock_perm, authenticated_client, sample_case):
        response = authenticated_client.get(f"/api/cases/{sample_case.id}/activity-log/")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_activity_log_has_entries(self, mock_perm, authenticated_client, sample_case):
        CaseActivityLog.objects.create(
            case=sample_case,
            activity_type="created",
            user_id=LAWYER_ID,
            description="Caso creado",
        )
        CaseActivityLog.objects.create(
            case=sample_case,
            activity_type="updated",
            user_id=LAWYER_ID,
            description="Caso actualizado",
        )
        response = authenticated_client.get(f"/api/cases/{sample_case.id}/activity-log/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


@pytest.mark.django_db
class TestCaseStatsEndpoint:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_stats_empty(self, mock_perm, authenticated_client):
        response = authenticated_client.get("/api/cases/stats/")
        assert response.status_code == status.HTTP_200_OK
        assert "total" in response.data
        assert "by_status" in response.data
        assert "by_type" in response.data
        assert "urgent" in response.data

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_stats_with_data(self, mock_perm, authenticated_client):
        Case.objects.create(
            case_number="EXP-STAT-001",
            title="Caso civil",
            case_type="civil",
            status="open",
            assigned_lawyer_id=LAWYER_ID,
            client_id=CLIENT_ID,
            opened_at=date.today(),
            created_by=LAWYER_ID,
        )
        Case.objects.create(
            case_number="EXP-STAT-002",
            title="Caso laboral urgente",
            case_type="labor",
            status="in_progress",
            is_urgent=True,
            assigned_lawyer_id=LAWYER_ID,
            client_id=CLIENT_ID,
            opened_at=date.today(),
            created_by=LAWYER_ID,
        )
        response = authenticated_client.get("/api/cases/stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 2
        assert response.data["urgent"] == 1
        assert "civil" in response.data["by_type"]
        assert "labor" in response.data["by_type"]


@pytest.mark.django_db
class TestCaseFiltering:
    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_filter_by_status(self, mock_perm, authenticated_client):
        Case.objects.create(
            case_number="EXP-FILT-001",
            title="Caso abierto",
            case_type="civil",
            status="open",
            assigned_lawyer_id=LAWYER_ID,
            client_id=CLIENT_ID,
            opened_at=date.today(),
            created_by=LAWYER_ID,
        )
        Case.objects.create(
            case_number="EXP-FILT-002",
            title="Caso cerrado",
            case_type="civil",
            status="closed",
            assigned_lawyer_id=LAWYER_ID,
            client_id=CLIENT_ID,
            opened_at=date.today(),
            created_by=LAWYER_ID,
        )
        response = authenticated_client.get("/api/cases/?status=open")
        assert response.status_code == status.HTTP_200_OK
        assert all(c["status"] == "open" for c in response.data["results"])

    @patch("apps.matters.api.views.check_permission", return_value=True)
    def test_search_by_title(self, mock_perm, authenticated_client):
        Case.objects.create(
            case_number="EXP-SRCH-001",
            title="Caso de herencia familiar",
            case_type="family",
            status="open",
            assigned_lawyer_id=LAWYER_ID,
            client_id=CLIENT_ID,
            opened_at=date.today(),
            created_by=LAWYER_ID,
        )
        Case.objects.create(
            case_number="EXP-SRCH-002",
            title="Disputa corporativa",
            case_type="corporate",
            status="open",
            assigned_lawyer_id=LAWYER_ID,
            client_id=CLIENT_ID,
            opened_at=date.today(),
            created_by=LAWYER_ID,
        )
        response = authenticated_client.get("/api/cases/?search=herencia")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert "herencia" in response.data["results"][0]["title"].lower()
