from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission, RolePermission, UserRole


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "user_type", "is_active")
    list_filter = ("user_type", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "bar_number")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Información Legal", {"fields": ("user_type", "phone", "bar_number", "department")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Información Legal", {"fields": ("user_type", "phone", "bar_number", "department")}),
    )


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 1


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_system_role", "parent", "created_at")
    list_filter = ("is_system_role",)
    search_fields = ("name", "description")
    inlines = [RolePermissionInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "name", "resource_type", "action")
    list_filter = ("resource_type", "action")
    search_fields = ("codename", "name")


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "scope_type", "scope_id", "assigned_at")
    list_filter = ("role", "scope_type")
    search_fields = ("user__username", "role__name")
