import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


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
