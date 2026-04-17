import logging
import mimetypes

from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.documents.models import Document, DocumentVersion, DocumentAccessLog
from apps.documents.api.serializers import (
    DocumentListSerializer,
    DocumentDetailSerializer,
    DocumentUploadSerializer,
    DocumentUpdateSerializer,
    DocumentVersionSerializer,
    NewVersionSerializer,
    DocumentAccessLogSerializer,
)
from apps.documents.iam_client import check_permission
from apps.documents.events.publisher import publish_event

logger = logging.getLogger(__name__)


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _log_access(document, user_id, action_type, request, success=True, details=None):
    """Crea un registro de auditoría para cada acceso a documentos."""
    DocumentAccessLog.objects.create(
        document=document,
        document_title=document.title if document else "N/A",
        user_id=user_id,
        action=action_type,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        success=success,
        details=details or {},
    )


@extend_schema_view(
    list=extend_schema(summary="Listar documentos"),
    retrieve=extend_schema(summary="Detalle de documento"),
)
class DocumentViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "delete"]
    filterset_fields = ["case_id", "document_type", "status", "is_confidential"]

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.prefetch_related("versions").all()
        user_type = getattr(user, "user_type", None)
        if user_type == "client":
            qs = qs.filter(uploaded_by=user.id, is_confidential=False)
        elif user_type == "lawyer":
            qs = qs.filter(is_confidential=False)
        return qs
    search_fields = ["title", "description", "original_filename"]
    ordering_fields = ["created_at", "updated_at", "title", "file_size"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentDetailSerializer
        if self.action == "create":
            return DocumentUploadSerializer
        if self.action in ("partial_update", "update"):
            return DocumentUpdateSerializer
        return DocumentListSerializer

    def list(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "read"):
            return Response(
                {"detail": "No tiene permiso para listar documentos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "read", resource_id=str(instance.id)):
            _log_access(instance, request.user.id, "view", request, success=False)
            return Response(
                {"detail": "No tiene permiso para ver este documento."},
                status=status.HTTP_403_FORBIDDEN,
            )
        _log_access(instance, request.user.id, "view", request)
        publish_event("document.accessed", {
            "document_id": str(instance.id),
            "user_id": str(request.user.id),
            "action": "view",
        })
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(summary="Subir documento", request=DocumentUploadSerializer)
    def create(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "create"):
            return Response(
                {"detail": "No tiene permiso para subir documentos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        uploaded_file = data["file"]
        file_content = uploaded_file.read()
        uploaded_file.seek(0)

        file_hash = Document.compute_file_hash(file_content)
        mime_type = mimetypes.guess_type(uploaded_file.name)[0] or "application/octet-stream"

        document = Document.objects.create(
            title=data["title"],
            description=data.get("description", ""),
            document_type=data["document_type"],
            status=data.get("status", "draft"),
            file=uploaded_file,
            original_filename=uploaded_file.name,
            mime_type=mime_type,
            file_size=uploaded_file.size,
            file_hash=file_hash,
            case_id=data["case_id"],
            uploaded_by=request.user.id,
            is_confidential=data.get("is_confidential", False),
            tags=data.get("tags", []),
        )

        DocumentVersion.objects.create(
            document=document,
            version_number=1,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            mime_type=mime_type,
            file_size=uploaded_file.size,
            file_hash=file_hash,
            change_summary="Versión inicial",
            created_by=request.user.id,
        )

        _log_access(document, request.user.id, "upload", request, details={
            "filename": uploaded_file.name,
            "size": uploaded_file.size,
        })

        publish_event("document.uploaded", {
            "document_id": str(document.id),
            "title": document.title,
            "case_id": str(document.case_id),
            "uploaded_by": str(request.user.id),
            "document_type": document.document_type,
        })

        response_serializer = DocumentDetailSerializer(document)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.save()
        _log_access(instance, self.request.user.id, "update", self.request)

    def perform_destroy(self, instance):
        if not check_permission(self.request.user.id, "delete", resource_id=str(instance.id)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No tiene permiso para eliminar este documento.")
        _log_access(instance, self.request.user.id, "delete", self.request)
        instance.delete()

    @extend_schema(summary="Descargar documento")
    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        document = self.get_object()

        if not check_permission(request.user.id, "download", resource_id=str(document.id)):
            _log_access(document, request.user.id, "download", request, success=False)
            return Response(
                {"detail": "No tiene permiso para descargar este documento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not document.file:
            return Response(
                {"detail": "Archivo no disponible."},
                status=status.HTTP_404_NOT_FOUND,
            )

        _log_access(document, request.user.id, "download", request)

        publish_event("document.accessed", {
            "document_id": str(document.id),
            "user_id": str(request.user.id),
            "action": "download",
        })

        response = FileResponse(
            document.file.open("rb"),
            content_type=document.mime_type,
        )
        response["Content-Disposition"] = f'attachment; filename="{document.original_filename}"'
        return response

    @extend_schema(
        summary="Listar versiones del documento",
        responses={200: DocumentVersionSerializer(many=True)},
    )
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        document = self.get_object()

        if not check_permission(request.user.id, "read", resource_id=str(document.id)):
            return Response(
                {"detail": "No tiene permiso para ver las versiones."},
                status=status.HTTP_403_FORBIDDEN,
            )

        versions = document.versions.all()
        serializer = DocumentVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Subir nueva versión del documento",
        request=NewVersionSerializer,
    )
    @action(detail=True, methods=["post"], url_path="new-version")
    def new_version(self, request, pk=None):
        document = self.get_object()

        if not check_permission(request.user.id, "update", resource_id=str(document.id)):
            return Response(
                {"detail": "No tiene permiso para crear nuevas versiones."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = NewVersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data["file"]
        file_content = uploaded_file.read()
        uploaded_file.seek(0)

        file_hash = Document.compute_file_hash(file_content)
        mime_type = mimetypes.guess_type(uploaded_file.name)[0] or "application/octet-stream"

        new_version_number = document.current_version + 1

        version = DocumentVersion.objects.create(
            document=document,
            version_number=new_version_number,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            mime_type=mime_type,
            file_size=uploaded_file.size,
            file_hash=file_hash,
            change_summary=serializer.validated_data.get("change_summary", ""),
            created_by=request.user.id,
        )

        document.file = uploaded_file
        document.original_filename = uploaded_file.name
        document.mime_type = mime_type
        document.file_size = uploaded_file.size
        document.file_hash = file_hash
        document.current_version = new_version_number
        document.save()

        _log_access(document, request.user.id, "version_create", request, details={
            "version": new_version_number,
            "filename": uploaded_file.name,
        })

        publish_event("document.uploaded", {
            "document_id": str(document.id),
            "title": document.title,
            "case_id": str(document.case_id),
            "uploaded_by": str(request.user.id),
            "version": new_version_number,
        })

        response_serializer = DocumentVersionSerializer(version)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Descargar una versión específica del documento")
    @action(detail=True, methods=["get"], url_path="versions/(?P<version_number>[0-9]+)/download")
    def download_version(self, request, pk=None, version_number=None):
        document = self.get_object()

        if not check_permission(request.user.id, "download", resource_id=str(document.id)):
            _log_access(document, request.user.id, "download", request, success=False)
            return Response(
                {"detail": "No tiene permiso para descargar este documento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            version = document.versions.get(version_number=version_number)
        except DocumentVersion.DoesNotExist:
            return Response({"detail": "Versión no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not version.file:
            return Response({"detail": "Archivo no disponible."}, status=status.HTTP_404_NOT_FOUND)

        _log_access(document, request.user.id, "download", request, details={"version": version_number})

        response = FileResponse(
            version.file.open("rb"),
            content_type=version.mime_type,
        )
        response["Content-Disposition"] = f'attachment; filename="{version.original_filename}"'
        return response

    @extend_schema(summary="Historial de accesos del documento")
    @action(detail=True, methods=["get"], url_path="audit-log")
    def audit_log(self, request, pk=None):
        document = self.get_object()

        if not check_permission(request.user.id, "read", resource_id=str(document.id)):
            return Response(
                {"detail": "No tiene permiso para ver el historial de accesos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logs = DocumentAccessLog.objects.filter(document=document)
        serializer = DocumentAccessLogSerializer(logs, many=True)
        return Response(serializer.data)
