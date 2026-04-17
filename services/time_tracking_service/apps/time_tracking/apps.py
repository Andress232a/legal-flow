from django.apps import AppConfig


class TimeTrackingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.time_tracking"
    verbose_name = "Control de Tiempo"

    def ready(self):
        import apps.time_tracking.openapi  # noqa: F401 — registra extensiones drf-spectacular
