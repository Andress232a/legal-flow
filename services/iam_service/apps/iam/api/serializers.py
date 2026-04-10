from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.iam.models import Role, Permission, RolePermission, UserRole

User = get_user_model()


class UserListSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name",
            "user_type", "phone", "bar_number", "department",
            "is_active", "roles", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_roles(self, obj):
        return list(
            obj.user_roles.select_related("role")
            .values_list("role__name", flat=True)
        )


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "password", "password_confirm",
            "first_name", "last_name", "user_type", "phone",
            "bar_number", "department",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "user_type",
            "phone", "bar_number", "department", "is_active",
        )
        read_only_fields = ("id",)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Contraseña actual incorrecta.")
        return value


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "codename", "name", "description", "resource_type", "action", "created_at")
        read_only_fields = ("id", "created_at")


class RolePermissionSerializer(serializers.ModelSerializer):
    permission_detail = PermissionSerializer(source="permission", read_only=True)

    class Meta:
        model = RolePermission
        fields = ("id", "permission", "permission_detail", "granted_at", "granted_by")
        read_only_fields = ("id", "granted_at")


class RoleListSerializer(serializers.ModelSerializer):
    permissions_count = serializers.IntegerField(source="role_permissions.count", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)

    class Meta:
        model = Role
        fields = (
            "id", "name", "description", "is_system_role",
            "parent", "parent_name", "permissions_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RoleDetailSerializer(serializers.ModelSerializer):
    permissions = RolePermissionSerializer(source="role_permissions", many=True, read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)

    class Meta:
        model = Role
        fields = (
            "id", "name", "description", "is_system_role",
            "parent", "parent_name", "permissions",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserRole
        fields = (
            "id", "user", "user_name", "role", "role_name",
            "scope_type", "scope_id", "assigned_at", "assigned_by",
        )
        read_only_fields = ("id", "assigned_at")


class CheckPermissionSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    action = serializers.CharField(max_length=30)
    resource_type = serializers.CharField(max_length=30)
    resource_id = serializers.UUIDField(required=False, allow_null=True)


class CheckPermissionResponseSerializer(serializers.Serializer):
    allowed = serializers.BooleanField()
    user_id = serializers.UUIDField()
    action = serializers.CharField()
    resource_type = serializers.CharField()
    resource_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(required=False)
