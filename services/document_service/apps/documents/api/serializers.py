from rest_framework import serializers
from apps.documents.models import Document, DocumentVersion, DocumentAccessLog


class DocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersion
        fields = (
            "id", "version_number", "original_filename", "mime_type",
            "file_size", "file_hash", "change_summary",
            "created_by", "created_at",
        )
        read_only_fields = ("id", "version_number", "file_hash", "created_at")


class DocumentListSerializer(serializers.ModelSerializer):
    versions_count = serializers.IntegerField(source="versions.count", read_only=True)

    class Meta:
        model = Document
        fields = (
            "id", "title", "description", "document_type", "status",
            "original_filename", "mime_type", "file_size",
            "case_id", "uploaded_by", "current_version",
            "is_confidential", "tags", "versions_count",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "original_filename", "mime_type", "file_size",
            "file_hash", "uploaded_by", "current_version",
            "created_at", "updated_at",
        )


class DocumentDetailSerializer(serializers.ModelSerializer):
    versions = DocumentVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = (
            "id", "title", "description", "document_type", "status",
            "original_filename", "mime_type", "file_size", "file_hash",
            "case_id", "uploaded_by", "current_version",
            "is_confidential", "tags", "metadata", "versions",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "original_filename", "mime_type", "file_size",
            "file_hash", "uploaded_by", "current_version",
            "created_at", "updated_at",
        )


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer para la subida de documentos."""
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    document_type = serializers.ChoiceField(
        choices=Document.DocumentType.choices,
        default=Document.DocumentType.OTHER,
    )
    status = serializers.ChoiceField(
        choices=Document.DocumentStatus.choices,
        default=Document.DocumentStatus.DRAFT,
        required=False,
    )
    case_id = serializers.UUIDField()
    is_confidential = serializers.BooleanField(default=False)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )
    file = serializers.FileField()

    def validate_file(self, value):
        from django.conf import settings
        if value.size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise serializers.ValidationError(
                f"El archivo excede el tamaño máximo de {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        return value


class DocumentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ("title", "description", "document_type", "status", "is_confidential", "tags", "metadata")


class NewVersionSerializer(serializers.Serializer):
    """Serializer para subir una nueva versión de un documento."""
    file = serializers.FileField()
    change_summary = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_file(self, value):
        from django.conf import settings
        if value.size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise serializers.ValidationError(
                f"El archivo excede el tamaño máximo de {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        return value


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAccessLog
        fields = (
            "id", "document", "document_title", "user_id",
            "action", "ip_address", "details", "success", "timestamp",
        )
        read_only_fields = fields
