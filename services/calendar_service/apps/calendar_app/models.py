import uuid
from django.db import models
from django.utils import timezone


class CalendarEvent(models.Model):
    class EventType(models.TextChoices):
        HEARING = "hearing", "Audiencia"
        DEADLINE = "deadline", "Plazo procesal"
        FILING = "filing", "Escrito / Presentación"
        TRIAL = "trial", "Juicio oral"
        APPEAL = "appeal", "Recurso"
        NOTIFICATION = "notification", "Notificación"
        MEETING = "meeting", "Reunión"
        PAYMENT = "payment", "Vencimiento de pago"
        OTHER = "other", "Otro"

    class Priority(models.TextChoices):
        LOW = "low", "Baja"
        MEDIUM = "medium", "Media"
        HIGH = "high", "Alta"
        CRITICAL = "critical", "Crítica"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referencias externas
    case_id = models.UUIDField(db_index=True, null=True, blank=True)
    case_date_id = models.UUIDField(
        null=True, blank=True,
        help_text="ID del CaseDate del Matter Service (si viene sincronizado)",
    )
    assigned_to = models.UUIDField(db_index=True, help_text="user_id del responsable")
    created_by = models.UUIDField()

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices, default=EventType.OTHER)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)

    start_datetime = models.DateTimeField(db_index=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    location = models.CharField(max_length=300, blank=True)

    is_legal_deadline = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Cache para evitar cross-service en listados
    case_number = models.CharField(max_length=30, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "calendar_events"
        ordering = ["start_datetime"]
        indexes = [
            models.Index(fields=["assigned_to", "start_datetime"]),
            models.Index(fields=["case_id", "start_datetime"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_datetime.date()})"

    def mark_completed(self):
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=["is_completed", "completed_at"])


class EventReminder(models.Model):
    class ReminderUnit(models.TextChoices):
        MINUTES = "minutes", "Minutos"
        HOURS = "hours", "Horas"
        DAYS = "days", "Días"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, related_name="reminders")
    remind_before_value = models.PositiveIntegerField(default=1)
    remind_before_unit = models.CharField(max_length=10, choices=ReminderUnit.choices, default=ReminderUnit.DAYS)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "event_reminders"

    def __str__(self):
        return f"Recordatorio {self.remind_before_value} {self.remind_before_unit} antes de {self.event.title}"

    @property
    def remind_at(self):
        from datetime import timedelta
        delta_map = {
            "minutes": timedelta(minutes=self.remind_before_value),
            "hours": timedelta(hours=self.remind_before_value),
            "days": timedelta(days=self.remind_before_value),
        }
        delta = delta_map.get(self.remind_before_unit, timedelta(days=1))
        return self.event.start_datetime - delta
