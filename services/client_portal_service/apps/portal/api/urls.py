from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.portal.api.views import PortalMessageViewSet

router = DefaultRouter()
router.register(r"messages", PortalMessageViewSet, basename="portal-message")

urlpatterns = [
    path("", include(router.urls)),
]
