from django.urls import path

from apps.analytics.api.views import KPIView, DashboardView, DeadlineComplianceView

urlpatterns = [
    path("kpis/", KPIView.as_view(), name="kpis"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("deadline-compliance/", DeadlineComplianceView.as_view(), name="deadline-compliance"),
]
