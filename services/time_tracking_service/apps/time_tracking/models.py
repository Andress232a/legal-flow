import uuid
from django.db import models
from django.utils import timezone


class TimeEntry(models.Model):
    """
    Registro de tiempo dedicado a un caso.
    Puede ser creado manualmente o generado al detener un Timer.
    """

    TASK_TYPE_CHOICES = [
        ("research", "Investigación"),
        ("drafting", "Redacción de documentos"),
        ("court", "Actuación judicial"),
        ("client_meeting", "Reunión con cliente"),
        ("negotiation", "Negociación"),
        ("review", "Revisión y análisis"),
        ("admin", "Gestión administrativa"),
        ("travel", "Desplazamiento"),
        ("other", "Otro"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referencia externa al Matter Service
    case_id = models.UUIDField(db_index=True)
    case_number = models.CharField(max_length=100, blank=True)  # Desnormalizado para legibilidad

    # Usuario del IAM Service
    user_id = models.UUIDField(db_index=True)
    user_name = models.CharField(max_length=200, blank=True)  # Desnormalizado

    # Descripción del trabajo
    task_type = models.CharField(max_length=30, choices=TASK_TYPE_CHOICES, default="other")
    description = models.TextField()

    # Tiempo
    date = models.DateField(db_index=True)
    duration_minutes = models.PositiveIntegerField(help_text="Duración en minutos")

    # Facturación
    is_billable = models.BooleanField(default=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                      help_text="Tarifa por hora en EUR. Null = usar tarifa del cliente.")

    # Origen
    created_from_timer = models.BooleanField(default=False)
    timer = models.OneToOneField(
        "Timer", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="time_entry"
    )

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["case_id", "date"]),
            models.Index(fields=["user_id", "date"]),
            models.Index(fields=["case_id", "is_billable"]),
        ]

    def __str__(self):
        return f"{self.user_name or self.user_id} — {self.case_number or self.case_id} ({self.duration_minutes} min)"

    @property
    def duration_hours(self):
        return round(self.duration_minutes / 60, 2)

    @property
    def billable_amount(self):
        if self.is_billable and self.hourly_rate:
            return round(float(self.hourly_rate) * self.duration_hours, 2)
        return 0.0


class Timer(models.Model):
    """
    Temporizador en tiempo real. Un usuario puede tener un solo timer activo.
    Al detenerlo se crea un TimeEntry automáticamente.
    """

    STATUS_CHOICES = [
        ("running", "En curso"),
        ("paused", "Pausado"),
        ("stopped", "Detenido"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Referencias externas
    case_id = models.UUIDField(db_index=True)
    case_number = models.CharField(max_length=100, blank=True)
    user_id = models.UUIDField(db_index=True)

    # Descripción
    task_type = models.CharField(
        max_length=30,
        choices=TimeEntry.TASK_TYPE_CHOICES,
        default="other"
    )
    description = models.TextField(blank=True)
    is_billable = models.BooleanField(default=True)

    # Control de tiempo
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="running")
    started_at = models.DateTimeField(default=timezone.now)
    paused_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)

    # Acumulado de pausas previas (en segundos)
    accumulated_seconds = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "status"]),
            models.Index(fields=["case_id", "status"]),
        ]

    def __str__(self):
        return f"Timer({self.user_id}) — {self.case_id} [{self.status}]"

    @property
    def elapsed_seconds(self):
        """Segundos totales transcurridos (incluyendo pausas previas)."""
        if self.status == "stopped":
            return self.accumulated_seconds
        if self.status == "paused":
            return self.accumulated_seconds
        # running
        return self.accumulated_seconds + int((timezone.now() - self.started_at).total_seconds())

    @property
    def elapsed_minutes(self):
        return max(1, round(self.elapsed_seconds / 60))
