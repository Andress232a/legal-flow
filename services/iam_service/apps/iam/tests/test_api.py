import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.iam.models import Role, Permission, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin",
        email="admin@legalflow.com",
        password="AdminPass123!",
        user_type="admin",
        is_staff=True,
    )


@pytest.fixture
def lawyer_user(db):
    return User.objects.create_user(
        username="lawyer1",
        email="lawyer1@legalflow.com",
        password="LawyerPass123!",
        user_type="lawyer",
    )


@pytest.fixture
def authenticated_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def authenticated_lawyer(api_client, lawyer_user):
    api_client.force_authenticate(user=lawyer_user)
    return api_client


@pytest.mark.django_db
class TestUserEndpoints:
    def test_list_users(self, authenticated_admin):
        response = authenticated_admin.get("/api/users/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_user(self, authenticated_admin):
        data = {
            "username": "nuevo_abogado",
            "email": "nuevo@legalflow.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Juan",
            "last_name": "Pérez",
            "user_type": "lawyer",
        }
        response = authenticated_admin.post("/api/users/", data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["username"] == "nuevo_abogado"

    def test_create_user_password_mismatch(self, authenticated_admin):
        data = {
            "username": "test_user",
            "email": "test@legalflow.com",
            "password": "SecurePass123!",
            "password_confirm": "DifferentPass!",
            "first_name": "Test",
            "last_name": "User",
        }
        response = authenticated_admin.post("/api/users/", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_admin_cannot_create_user(self, authenticated_lawyer):
        data = {
            "username": "test",
            "email": "t@t.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
        }
        response = authenticated_lawyer.post("/api/users/", data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_me(self, authenticated_lawyer, lawyer_user):
        response = authenticated_lawyer.get("/api/users/me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == lawyer_user.username

    def test_unauthenticated_access(self, api_client):
        response = api_client.get("/api/users/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestRoleEndpoints:
    def test_list_roles(self, authenticated_admin):
        Role.objects.create(name="Test Role")
        response = authenticated_admin.get("/api/roles/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_role(self, authenticated_admin):
        data = {"name": "Custom Role", "description": "Rol personalizado"}
        response = authenticated_admin.post("/api/roles/", data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_cannot_delete_system_role(self, authenticated_admin):
        role = Role.objects.create(name="System Role", is_system_role=True)
        response = authenticated_admin.delete(f"/api/roles/{role.id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestPermissionEndpoints:
    def test_list_permissions(self, authenticated_admin):
        Permission.objects.create(
            codename="test.read", name="Test Read",
            resource_type="case", action="read",
        )
        response = authenticated_admin.get("/api/permissions/")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_permissions_by_resource(self, authenticated_admin):
        Permission.objects.create(
            codename="case.read", name="Leer caso",
            resource_type="case", action="read",
        )
        Permission.objects.create(
            codename="document.read", name="Leer doc",
            resource_type="document", action="read",
        )
        response = authenticated_admin.get("/api/permissions/?resource_type=case")
        assert response.status_code == status.HTTP_200_OK
        assert all(
            p["resource_type"] == "case" for p in response.data["results"]
        )


@pytest.mark.django_db
class TestCheckPermission:
    def test_admin_always_allowed(self, api_client, admin_user):
        response = api_client.post("/api/check-permission/", {
            "user_id": str(admin_user.id),
            "action": "delete",
            "resource_type": "case",
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["allowed"] is True

    def test_user_with_permission(self, api_client, lawyer_user):
        role = Role.objects.create(name="Viewer")
        perm = Permission.objects.create(
            codename="case.read", name="Leer caso",
            resource_type="case", action="read",
        )
        RolePermission.objects.create(role=role, permission=perm)
        UserRole.objects.create(user=lawyer_user, role=role)

        response = api_client.post("/api/check-permission/", {
            "user_id": str(lawyer_user.id),
            "action": "read",
            "resource_type": "case",
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["allowed"] is True

    def test_user_without_permission(self, api_client, lawyer_user):
        response = api_client.post("/api/check-permission/", {
            "user_id": str(lawyer_user.id),
            "action": "delete",
            "resource_type": "case",
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["allowed"] is False

    def test_inactive_user_denied(self, api_client, db):
        user = User.objects.create_user(
            username="inactive", password="Pass123!", is_active=False,
        )
        response = api_client.post("/api/check-permission/", {
            "user_id": str(user.id),
            "action": "read",
            "resource_type": "case",
        })
        assert response.data["allowed"] is False
