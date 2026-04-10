import uuid
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.documents.models import Document, DocumentVersion, DocumentAccessLog


@pytest.mark.django_db
class TestDocumentModel:
    def test_create_document(self):
        test_file = SimpleUploadedFile(
            "contrato.pdf",
            b"contenido de prueba del pdf",
            content_type="application/pdf",
        )
        doc = Document.objects.create(
            title="Contrato de Compraventa",
            description="Contrato entre las partes",
            document_type="contract",
            file=test_file,
            original_filename="contrato.pdf",
            mime_type="application/pdf",
            file_size=len(b"contenido de prueba del pdf"),
            file_hash=Document.compute_file_hash(b"contenido de prueba del pdf"),
            case_id=uuid.uuid4(),
            uploaded_by=uuid.uuid4(),
        )
        assert doc.title == "Contrato de Compraventa"
        assert doc.current_version == 1
        assert doc.status == "draft"
        assert str(doc) == "Contrato de Compraventa (v1)"

    def test_compute_file_hash(self):
        content = b"test content"
        hash1 = Document.compute_file_hash(content)
        hash2 = Document.compute_file_hash(content)
        assert hash1 == hash2
        assert len(hash1) == 64

    def test_document_tags(self):
        test_file = SimpleUploadedFile("doc.pdf", b"test", content_type="application/pdf")
        doc = Document.objects.create(
            title="Doc with tags",
            file=test_file,
            original_filename="doc.pdf",
            mime_type="application/pdf",
            file_size=4,
            file_hash="abc123",
            case_id=uuid.uuid4(),
            uploaded_by=uuid.uuid4(),
            tags=["urgente", "confidencial"],
        )
        assert "urgente" in doc.tags
        assert len(doc.tags) == 2


@pytest.mark.django_db
class TestDocumentVersion:
    def test_create_version(self):
        test_file = SimpleUploadedFile("v1.pdf", b"version 1", content_type="application/pdf")
        doc = Document.objects.create(
            title="Test Doc",
            file=test_file,
            original_filename="v1.pdf",
            mime_type="application/pdf",
            file_size=9,
            file_hash="hash1",
            case_id=uuid.uuid4(),
            uploaded_by=uuid.uuid4(),
        )
        version_file = SimpleUploadedFile("v1.pdf", b"version 1", content_type="application/pdf")
        version = DocumentVersion.objects.create(
            document=doc,
            version_number=1,
            file=version_file,
            original_filename="v1.pdf",
            mime_type="application/pdf",
            file_size=9,
            file_hash="hash1",
            change_summary="Versión inicial",
            created_by=uuid.uuid4(),
        )
        assert version.version_number == 1
        assert version.document == doc


@pytest.mark.django_db
class TestDocumentAccessLog:
    def test_create_access_log(self):
        test_file = SimpleUploadedFile("log.pdf", b"test", content_type="application/pdf")
        doc = Document.objects.create(
            title="Log Test",
            file=test_file,
            original_filename="log.pdf",
            mime_type="application/pdf",
            file_size=4,
            file_hash="hash_log",
            case_id=uuid.uuid4(),
            uploaded_by=uuid.uuid4(),
        )
        user_id = uuid.uuid4()
        log = DocumentAccessLog.objects.create(
            document=doc,
            document_title=doc.title,
            user_id=user_id,
            action="download",
            ip_address="192.168.1.1",
            success=True,
        )
        assert log.action == "download"
        assert log.success is True
        assert log.user_id == user_id
