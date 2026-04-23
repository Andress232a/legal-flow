from django.contrib import admin

from apps.portal.models import PortalMessage


@admin.register(PortalMessage)
class PortalMessageAdmin(admin.ModelAdmin):
    list_display = ("case_id", "sender_id", "recipient_id", "created_at", "read_at")
    list_filter = ("created_at",)
    search_fields = ("body",)
