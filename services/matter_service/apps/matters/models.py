import uuid
from django.db import models


class Case(models.Model):
    """
    Caso legal — núcleo del Matter Service.
    Almacena todos los metadatos del ciclo de vida de un caso.
    """

    class CaseType(models.TextChoices):
        CIVIL = "civil", "Civil"
        CRIMINAL = "criminal", "Penal"
        CORPORATE = "corporate", "Corporativo"
        FAMILY = "family", "Familia"
        LABOR = "labor", "Laboral"
        ADMINISTRATIVE = "administrative", "Administrativo"
        CONSTITUTIONAL = "constitutional", "Constitucional"
        OTHER = "other", "Otro"

    class CaseStatus(models.TextChoices):
        OPEN = "open", "Abierto"
        IN_PROGRESS = "in_progress", "En proceso"
        ON_HOLD = "on_hold", "En espera"
        IN_APPEAL = "in_appeal", "En apelación"
        CLOSED = "closed", "Cerrado"
        ARCHIVED = "archived", "Archivado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    case_number = models.CharField(
        max_length=100,
        unique=True,
        help_text="Número de expediente oficial",
    )
    case_type = models.CharField(
        max_length=30,
        choices=CaseType.choices,
        default=CaseType.OTHER,
    )
    status = models.CharField(
        max_length=30,
        choices=CaseStatus.choices,
        default=CaseStatus.OPEN,
    )
    jurisdiction = models.CharField(
        max_length=200,
        blank=True,
        help_text="Jurisdicción o tribunal competente",
    )
    court = models.CharField(
        max_length=200,
        blank=True,
        help_text="Juzgado o tribunal asignado",
    )
    # Referencias a usuarios del IAM Service (UUID externo)
    assigned_lawyer_id = models.UUIDField(
        help_text="ID del abogado responsable (IAM Service)",
    )
    client_id = models.UUIDField(
        help_text="ID del cliente (IAM Service)",
    )
    # Fechas clave
    opened_at = models.DateField(
        help_text="Fecha de apertura del caso",
    )
    closed_at = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha de cierre del caso",
    )
    # Metadatos
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Etiquetas para clasificación y búsqueda",
    )
    notes = models.TextField(
        blank=True,
        help_text="Notas internas del caso",
    )
    is_urgent = models.BooleanField(
        default=False,
        help_text="Marca el caso como urgente",
    )
    created_by = models.UUIDField(
        help_text="ID del usuario que creó el caso (IAM Service)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cases"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["case_type"]),
            models.Index(fields=["assigned_lawyer_id"]),
            models.Index(fields=["client_id"]),
            models.Index(fields=["opened_at"]),
        ]
        verbose_name = "Caso"
        verbose_name_plural = "Casos"

    def __str__(self):
        return f"[{self.case_number}] {self.title}"


class CaseParty(models.Model):
    """
    Partes involucradas en el caso (cliente, contraparte, procurador, testigos, etc.)
    """

    class PartyRole(models.TextChoices):
        CLIENT = "client", "Cliente"
        OPPOSING_PARTY = "opposing_party", "Parte contraria"
        LAWYER = "lawyer", "Abogado"
        PROSECUTOR = "prosecutor", "Procurador"
        WITNESS = "witness", "Testigo"
        EXPERT = "expert", "Perito"
        JUDGE = "judge", "Juez"
        OTHER = "other", "Otro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="parties",
    )
    full_name = models.CharField(max_length=200)
    role = models.CharField(
        max_length=30,
        choices=PartyRole.choices,
        default=PartyRole.OTHER,
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    identification = models.CharField(
        max_length=100,
        blank=True,
        help_text="DNI, NIF, pasaporte u otro identificador",
    )
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    # Si es un usuario registrado en IAM Service
    user_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="ID del usuario en IAM Service (si aplica)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "case_parties"
        ordering = ["role", "full_name"]
        verbose_name = "Parte del Caso"
        verbose_name_plural = "Partes del Caso"

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()}) — {self.case.case_number}"


class CaseDate(models.Model):
    """
    Fechas y plazos importantes asociados a un caso.
    """

    class DateType(models.TextChoices):
        HEARING = "hearing", "Audiencia"
        DEADLINE = "deadline", "Plazo procesal"
        FILING = "filing", "Presentación de escrito"
        TRIAL = "trial", "Juicio oral"
        APPEAL = "appeal", "Recurso de apelación"
        NOTIFICATION = "notification", "Notificación"
        MEETING = "meeting", "Reunión con cliente"
        OTHER = "other", "Otro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="dates",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date_type = models.CharField(
        max_length=30,
        choices=DateType.choices,
        default=DateType.OTHER,
    )
    scheduled_date = models.DateTimeField(help_text="Fecha y hora del evento")
    is_critical = models.BooleanField(
        default=False,
        help_text="Fecha crítica que requiere atención inmediata",
    )
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.UUIDField(
        help_text="ID del usuario que creó la fecha (IAM Service)",
    )
    calendar_event_id = models.UUIDField(
        null=True, blank=True,
        help_text="ID del evento sincronizado en el Calendar Service",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "case_dates"
        ordering = ["scheduled_date"]
        indexes = [
            models.Index(fields=["case", "scheduled_date"]),
            models.Index(fields=["is_critical", "is_completed"]),
            models.Index(fields=["date_type"]),
        ]
        verbose_name = "Fecha del Caso"
        verbose_name_plural = "Fechas del Caso"

    def __str__(self):
        return f"{self.title} — {self.scheduled_date.strftime('%d/%m/%Y')} ({self.case.case_number})"


class CaseActivityLog(models.Model):
    """
    Auditoría completa de todas las acciones realizadas sobre un caso.
    """

    class ActivityType(models.TextChoices):
        CREATED = "created", "Caso creado"
        UPDATED = "updated", "Caso actualizado"
        STATUS_CHANGED = "status_changed", "Estado cambiado"
        PARTY_ADDED = "party_added", "Parte añadida"
        PARTY_REMOVED = "party_removed", "Parte eliminada"
        DATE_ADDED = "date_added", "Fecha añadida"
        DATE_COMPLETED = "date_completed", "Fecha completada"
        CLOSED = "closed", "Caso cerrado"
        REOPENED = "reopened", "Caso reabierto"
        ASSIGNED = "assigned", "Caso reasignado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
    )
    user_id = models.UUIDField(help_text="Usuario que realizó la acción")
    description = models.TextField()
    old_value = models.JSONField(
        null=True,
        blank=True,
        help_text="Valor anterior (para cambios de estado/asignación)",
    )
    new_value = models.JSONField(
        null=True,
        blank=True,
        help_text="Valor nuevo (para cambios de estado/asignación)",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "case_activity_log"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["case", "-timestamp"]),
            models.Index(fields=["user_id", "-timestamp"]),
            models.Index(fields=["activity_type"]),
        ]
        verbose_name = "Log de Actividad"
        verbose_name_plural = "Logs de Actividad"

    def __str__(self):
        return f"{self.activity_type} — {self.case.case_number} — {self.timestamp}"
