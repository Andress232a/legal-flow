import uuid
import pytest
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.documents.models import Document, DocumentVersion
from apps.documents.authentication import ServiceUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mock_user():
    return ServiceUser(
        user_id=str(uuid.uuid4()),
        claims={"user_type": "lawyer", "username": "abogado1"},
    )


@pytest.fixture
def authenticated_client(api_client, mock_user):
    api_client.force_authenticate(user=mock_user)
    return api_client


@pytest.fixture
def sample_document(db):
    test_file = SimpleUploadedFile("test.pdf", b"pdf content here", content_type="application/pdf")
    doc = Document.objects.create(
        title="Demanda Civil",
        description="Demanda de prueba",
        document_type="lawsuit",
        file=test_file,
        original_filename="test.pdf",
        mime_type="application/pdf",
        file_size=16,
        file_hash=Document.compute_file_hash(b"pdf content here"),
        case_id=uuid.uuid4(),
        uploaded_by=uuid.uuid4(),
    )
    version_file = SimpleUploadedFile("test.pdf", b"pdf content here", content_type="application/pdf")
    DocumentVersion.objects.create(
        document=doc,
        version_number=1,
        file=version_file,
        original_filename="test.pdf",
        mime_type="application/pdf",
        file_size=16,
        file_hash=doc.file_hash,
        change_summary="Versión inicial",
        created_by=doc.uploaded_by,
    )
    return doc


@pytest.mark.django_db
class TestDocumentEndpoints:
    @patch("apps.documents.api.views.check_permission", return_value=True)
    def test_list_documents(self, mock_perm, authenticated_client, sample_document):
        response = authenticated_client.get("/api/documents/")
        assert response.status_code == status.HTTP_200_OK

    @patch("apps.documents.api.views.check_permission", return_value=True)
    @patch("apps.documents.api.views.publish_event")
    def test_retrieve_document(self, mock_event, mock_perm, authenticated_client, sample_document):
        response = authenticated_client.get(f"/api/documents/{sample_document.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Demanda Civil"

    @patch("apps.documents.api.views.check_permission", return_value=False)
    def test_list_documents_permission_denied(self, mock_perm, authenticated_client):
        response = authenticated_client.get("/api/documents/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch("apps.documents.api.views.check_permission", return_value=True)
    @patch("apps.documents.api.views.publish_event")
    def test_upload_document(self, mock_event, mock_perm, authenticated_client):
        test_file = SimpleUploadedFile(
            "contrato.pdf", b"contenido del contrato", content_type="application/pdf"
        )
        data = {
            "title": "Nuevo Contrato",
            "description": "Contrato de prueba",
            "document_type": "contract",
            "case_id": str(uuid.uuid4()),
            "file": test_file,
        }
        response = authenticated_client.post("/api/documents/", data, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Nuevo Contrato"
        assert response.data["current_version"] == 1
        mock_event.assert_called()

    @patch("apps.documents.api.views.check_permission", return_value=True)
    @patch("apps.documents.api.views.publish_event")
    def test_download_document(self, mock_event, mock_perm, authenticated_client, sample_document):
        response = authenticated_client.get(f"/api/documents/{sample_document.id}/download/")
        assert response.status_code == status.HTTP_200_OK
        assert "Content-Disposition" in response

    @patch("apps.documents.api.views.check_permission", return_value=True)
    def test_list_versions(self, mock_perm, authenticated_client, sample_document):
        response = authenticated_client.get(f"/api/documents/{sample_document.id}/versions/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    @patch("apps.documents.api.views.check_permission", return_value=True)
    @patch("apps.documents.api.views.publish_event")
    def test_upload_new_version(self, mock_event, mock_perm, authenticated_client, sample_document):
        new_file = SimpleUploadedFile(
            "contrato_v2.pdf", b"contenido version 2", content_type="application/pdf"
        )
        data = {
            "file": new_file,
            "change_summary": "Actualización de cláusulas",
        }
        response = authenticated_client.post(
            f"/api/documents/{sample_document.id}/new-version/",
            data,
            format="multipart",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["version_number"] == 2

    def test_unauthenticated_access(self, api_client):
        response = api_client.get("/api/documents/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("apps.documents.api.views.check_permission", return_value=False)
    def test_download_permission_denied(self, mock_perm, authenticated_client, sample_document):
        response = authenticated_client.get(f"/api/documents/{sample_document.id}/download/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
