import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("billing")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Ejecutar mark_overdue_invoices todos los días a las 06:00 UTC
app.conf.beat_schedule = {
    "mark-overdue-invoices-daily": {
        "task": "billing.mark_overdue_invoices",
        "schedule": crontab(hour=6, minute=0),
    },
}
