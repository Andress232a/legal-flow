import uuid
import hashlib
from django.db import models
from django.conf import settings


def document_upload_path(instance, filename):
    """Genera la ruta de almacenamiento: documents/{case_id}/{uuid}/{filename}"""
    return f"documents/{instance.case_id}/{instance.id}/{filename}"


class Document(models.Model):
    """
    Documento legal con metadatos, versionado y control de acceso.
    Los archivos se almacenan cifrados y cada acceso queda auditado.
    """

    class DocumentType(models.TextChoices):
        CONTRACT = "contract", "Contrato"
        LAWSUIT = "lawsuit", "Demanda"
        BRIEF = "brief", "Escrito"
        EVIDENCE = "evidence", "Prueba"
        RULING = "ruling", "Sentencia"
        POWER_OF_ATTORNEY = "power_of_attorney", "Poder Notarial"
        INVOICE = "invoice", "Factura"
        CORRESPONDENCE = "correspondence", "Correspondencia"
        OTHER = "other", "Otro"

    class DocumentStatus(models.TextChoices):
        DRAFT = "draft", "Borrador"
        REVIEW = "review", "En revisión"
        APPROVED = "approved", "Aprobado"
        SIGNED = "signed", "Firmado"
        ARCHIVED = "archived", "Archivado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
    )
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
    )
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField(help_text="Tamaño en bytes")
    file_hash = models.CharField(
        max_length=64,
        help_text="SHA-256 del contenido del archivo",
    )
    case_id = models.UUIDField(
        db_index=True,
        help_text="ID del caso en el Matter Service",
    )
    uploaded_by = models.UUIDField(
        help_text="ID del usuario que subió el documento (del IAM Service)",
    )
    current_version = models.PositiveIntegerField(default=1)
    is_confidential = models.BooleanField(
        default=False,
        help_text="Documentos confidenciales requieren permisos adicionales",
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Etiquetas para búsqueda y clasificación",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Metadatos adicionales del documento",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "documents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["case_id", "-created_at"]),
            models.Index(fields=["document_type"]),
            models.Index(fields=["uploaded_by"]),
            models.Index(fields=["status"]),
        ]
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"

    def __str__(self):
        return f"{self.title} (v{self.current_version})"

    @staticmethod
    def compute_file_hash(file_content: bytes) -> str:
        return hashlib.sha256(file_content).hexdigest()


class DocumentVersion(models.Model):
    """
    Historial de versiones de un documento.
    Cada modificación crea una nueva versión preservando el archivo anterior.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to="documents/versions/")
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    file_hash = models.CharField(max_length=64)
    change_summary = models.TextField(
        blank=True,
        help_text="Descripción de los cambios en esta versión",
    )
    created_by = models.UUIDField(
        help_text="ID del usuario que creó esta versión",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_versions"
        ordering = ["-version_number"]
        unique_together = ("document", "version_number")
        verbose_name = "Versión de Documento"
        verbose_name_plural = "Versiones de Documentos"

    def __str__(self):
        return f"{self.document.title} - v{self.version_number}"


class DocumentAccessLog(models.Model):
    """
    Pista de auditoría de todos los accesos a documentos.
    Registra quién, cuándo, qué acción y desde dónde.
    """

    class AccessAction(models.TextChoices):
        VIEW = "view", "Visualización"
        DOWNLOAD = "download", "Descarga"
        UPLOAD = "upload", "Subida"
        UPDATE = "update", "Actualización"
        DELETE = "delete", "Eliminación"
        VERSION_CREATE = "version_create", "Creación de versión"
        PERMISSION_CHECK = "permission_check", "Verificación de permiso"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        related_name="access_logs",
    )
    document_title = models.CharField(
        max_length=255,
        help_text="Snapshot del título en el momento del acceso",
    )
    user_id = models.UUIDField(db_index=True)
    action = models.CharField(max_length=30, choices=AccessAction.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Información adicional sobre la acción",
    )
    success = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_access_log"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user_id", "-timestamp"]),
            models.Index(fields=["document", "-timestamp"]),
            models.Index(fields=["action"]),
        ]
        verbose_name = "Log de Acceso"
        verbose_name_plural = "Logs de Acceso"

    def __str__(self):
        return f"{self.action} - {self.document_title} - {self.timestamp}"
