import pytest
from django.contrib.auth import get_user_model
from apps.iam.models import Role, Permission, RolePermission, UserRole

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            username="abogado1",
            email="abogado1@legalflow.com",
            password="SecurePass123!",
            first_name="María",
            last_name="García",
            user_type="lawyer",
        )
        assert user.username == "abogado1"
        assert user.user_type == "lawyer"
        assert user.check_password("SecurePass123!")
        assert str(user) == "María García (lawyer)"

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            username="admin", email="admin@legalflow.com", password="Admin123!"
        )
        assert user.is_staff is True
        assert user.is_superuser is True


@pytest.mark.django_db
class TestRoleModel:
    def test_create_role(self):
        role = Role.objects.create(name="Abogado Senior", description="Rol senior")
        assert str(role) == "Abogado Senior"

    def test_role_hierarchy(self):
        parent = Role.objects.create(name="Abogado Senior")
        child = Role.objects.create(name="Abogado Junior", parent=parent)
        assert child.parent == parent

    def test_get_all_permissions_with_inheritance(self):
        parent = Role.objects.create(name="Parent")
        child = Role.objects.create(name="Child", parent=parent)

        perm1 = Permission.objects.create(
            codename="case.read", name="Leer caso",
            resource_type="case", action="read",
        )
        perm2 = Permission.objects.create(
            codename="case.create", name="Crear caso",
            resource_type="case", action="create",
        )

        RolePermission.objects.create(role=parent, permission=perm1)
        RolePermission.objects.create(role=child, permission=perm2)

        all_perms = child.get_all_permissions()
        assert perm1.id in all_perms
        assert perm2.id in all_perms


@pytest.mark.django_db
class TestUserRole:
    def test_assign_global_role(self):
        user = User.objects.create_user(username="test", password="Test123!")
        role = Role.objects.create(name="TestRole")
        ur = UserRole.objects.create(user=user, role=role)
        assert ur.scope_type == ""
        assert ur.scope_id is None

    def test_assign_scoped_role(self):
        import uuid
        user = User.objects.create_user(username="test2", password="Test123!")
        role = Role.objects.create(name="CaseRole")
        case_id = uuid.uuid4()
        ur = UserRole.objects.create(
            user=user, role=role,
            scope_type="case", scope_id=case_id,
        )
        assert ur.scope_type == "case"
        assert ur.scope_id == case_id
