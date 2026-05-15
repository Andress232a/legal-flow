from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.billing.api.views import InvoiceViewSet, FeeStructureViewSet, case_closed_webhook

router = DefaultRouter()
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"fee-structures", FeeStructureViewSet, basename="fee-structure")

urlpatterns = [
    path("", include(router.urls)),
    path("webhooks/case-closed/", case_closed_webhook, name="case-closed-webhook"),
]
