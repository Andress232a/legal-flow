import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class FeeStructure(models.Model):
    """Estructura de honorarios para un caso. Define cómo se cobra al cliente."""

    class FeeType(models.TextChoices):
        FLAT_RATE = "flat_rate", "Tarifa Plana"
        HOURLY = "hourly", "Por Hora"
        SUCCESS_FEE = "success_fee", "Cuota de Éxito"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_id = models.UUIDField(db_index=True, unique=True)
    fee_type = models.CharField(max_length=20, choices=FeeType.choices, default=FeeType.HOURLY)

    # Tarifa plana: monto fijo independiente de horas
    flat_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Monto fijo para tarifa plana",
    )
    # Por hora: precio por hora trabajada
    hourly_rate = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Precio por hora (tipo hourly)",
    )
    # Cuota de éxito: porcentaje del valor del caso al ganarlo
    success_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Porcentaje del valor del caso (tipo success_fee, ej: 20.00)",
    )
    estimated_case_value = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        help_text="Valor estimado del caso (para calcular cuota de éxito)",
    )

    notes = models.TextField(blank=True)
    created_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "fee_structures"

    def __str__(self):
        return f"Estructura {self.fee_type} — Caso {self.case_id}"

    def calculate_amount(self, hours_worked: Decimal = Decimal("0")) -> Decimal:
        """Calcula el monto a facturar según el tipo de tarifa."""
        if self.fee_type == self.FeeType.FLAT_RATE:
            return self.flat_amount or Decimal("0")
        if self.fee_type == self.FeeType.HOURLY:
            return ((self.hourly_rate or Decimal("0")) * hours_worked).quantize(Decimal("0.01"))
        if self.fee_type == self.FeeType.SUCCESS_FEE:
            value = self.estimated_case_value or Decimal("0")
            pct = (self.success_percentage or Decimal("0")) / Decimal("100")
            return (value * pct).quantize(Decimal("0.01"))
        return Decimal("0")


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        SENT = "sent", "Enviada"
        PAID = "paid", "Pagada"
        OVERDUE = "overdue", "Vencida"
        CANCELLED = "cancelled", "Cancelada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=20, unique=True, blank=True)

    # Referencias externas (UUID sin FK real — microservicios)
    case_id = models.UUIDField(db_index=True)
    client_id = models.UUIDField(db_index=True)
    lawyer_id = models.UUIDField(db_index=True, null=True, blank=True)
    created_by = models.UUIDField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    issue_date = models.DateField()
    due_date = models.DateField()

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Porcentaje IVA (ej: 19.00)",
    )
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    notes = models.TextField(blank=True)
    case_number = models.CharField(max_length=30, blank=True, help_text="Cache del número de expediente")
    client_name = models.CharField(max_length=200, blank=True, help_text="Cache del nombre del cliente")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invoices"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.invoice_number} — {self.status}"

    @property
    def balance_due(self):
        return self.total - self.amount_paid

    def recalculate(self):
        self.subtotal = sum(item.amount for item in self.items.all())
        self.tax_amount = (self.subtotal * self.tax_rate / Decimal("100")).quantize(Decimal("0.01"))
        self.total = self.subtotal + self.tax_amount
        self.save(update_fields=["subtotal", "tax_amount", "total"])


class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    time_entry_id = models.UUIDField(null=True, blank=True, help_text="Referencia a TimeEntry (opcional)")
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(
        max_digits=8, decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "invoice_items"
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.amount = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} — {self.amount}"


class Payment(models.Model):
    class Method(models.TextChoices):
        TRANSFER = "transfer", "Transferencia bancaria"
        CASH = "cash", "Efectivo"
        CARD = "card", "Tarjeta"
        CHECK = "check", "Cheque"
        OTHER = "other", "Otro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.TRANSFER)
    payment_date = models.DateField()
    reference = models.CharField(max_length=100, blank=True, help_text="Número de referencia / comprobante")
    notes = models.TextField(blank=True)
    registered_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"Pago {self.amount} ({self.method}) — Factura {self.invoice.invoice_number}"
