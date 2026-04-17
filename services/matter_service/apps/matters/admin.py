from django.contrib import admin
from .models import Case, CaseParty, CaseDate, CaseActivityLog


class CasePartyInline(admin.TabularInline):
    model = CaseParty
    extra = 1
    fields = ("full_name", "role", "email", "phone", "identification")


class CaseDateInline(admin.TabularInline):
    model = CaseDate
    extra = 1
    fields = ("title", "date_type", "scheduled_date", "is_critical", "is_completed")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        "case_number", "title", "case_type", "status",
        "jurisdiction", "is_urgent", "opened_at", "created_at",
    )
    list_filter = ("status", "case_type", "is_urgent")
    search_fields = ("case_number", "title", "jurisdiction", "court")
    inlines = [CasePartyInline, CaseDateInline]
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        ("Información Principal", {
            "fields": ("id", "case_number", "title", "description", "case_type", "status", "is_urgent"),
        }),
        ("Detalles Judiciales", {
            "fields": ("jurisdiction", "court"),
        }),
        ("Asignación", {
            "fields": ("assigned_lawyer_id", "client_id", "created_by"),
        }),
        ("Fechas", {
            "fields": ("opened_at", "closed_at"),
        }),
        ("Extra", {
            "fields": ("tags", "notes"),
            "classes": ("collapse",),
        }),
        ("Sistema", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


@admin.register(CaseParty)
class CasePartyAdmin(admin.ModelAdmin):
    list_display = ("full_name", "role", "case", "email", "phone")
    list_filter = ("role",)
    search_fields = ("full_name", "email", "identification", "case__case_number")


@admin.register(CaseDate)
class CaseDateAdmin(admin.ModelAdmin):
    list_display = ("title", "date_type", "case", "scheduled_date", "is_critical", "is_completed")
    list_filter = ("date_type", "is_critical", "is_completed")
    search_fields = ("title", "case__case_number")


@admin.register(CaseActivityLog)
class CaseActivityLogAdmin(admin.ModelAdmin):
    list_display = ("activity_type", "case", "user_id", "timestamp")
    list_filter = ("activity_type",)
    search_fields = ("case__case_number", "description")
    readonly_fields = ("id", "case", "activity_type", "user_id", "description",
                       "old_value", "new_value", "ip_address", "timestamp")
