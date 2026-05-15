from django.urls import path

from apps.analytics.api.views import KPIView

urlpatterns = [
    path("kpis/", KPIView.as_view(), name="kpis"),
]
