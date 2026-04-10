from django.contrib import admin
from .models import Document, DocumentVersion, DocumentAccessLog


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ("version_number", "file_hash", "file_size", "created_at", "created_by")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "document_type", "status", "case_id", "current_version", "created_at")
    list_filter = ("document_type", "status", "is_confidential")
    search_fields = ("title", "description", "original_filename")
    readonly_fields = ("id", "file_hash", "file_size", "uploaded_by", "created_at", "updated_at")
    inlines = [DocumentVersionInline]


@admin.register(DocumentAccessLog)
class DocumentAccessLogAdmin(admin.ModelAdmin):
    list_display = ("document_title", "user_id", "action", "success", "timestamp")
    list_filter = ("action", "success")
    search_fields = ("document_title", "user_id")
    readonly_fields = ("id", "timestamp")
