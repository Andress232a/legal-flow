from django.db import migrations, models
import django.core.validators
import uuid
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0002_alter_invoice_lawyer_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="FeeStructure",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_id", models.UUIDField(db_index=True, unique=True)),
                ("fee_type", models.CharField(
                    choices=[
                        ("flat_rate", "Tarifa Plana"),
                        ("hourly", "Por Hora"),
                        ("success_fee", "Cuota de Éxito"),
                    ],
                    default="hourly",
                    max_length=20,
                )),
                ("flat_amount", models.DecimalField(
                    blank=True, decimal_places=2, max_digits=12, null=True,
                    validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    help_text="Monto fijo para tarifa plana",
                )),
                ("hourly_rate", models.DecimalField(
                    blank=True, decimal_places=2, max_digits=10, null=True,
                    validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    help_text="Precio por hora (tipo hourly)",
                )),
                ("success_percentage", models.DecimalField(
                    blank=True, decimal_places=2, max_digits=5, null=True,
                    validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    help_text="Porcentaje del valor del caso (tipo success_fee, ej: 20.00)",
                )),
                ("estimated_case_value", models.DecimalField(
                    blank=True, decimal_places=2, max_digits=14, null=True,
                    help_text="Valor estimado del caso (para calcular cuota de éxito)",
                )),
                ("notes", models.TextField(blank=True)),
                ("created_by", models.UUIDField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "fee_structures"},
        ),
    ]
