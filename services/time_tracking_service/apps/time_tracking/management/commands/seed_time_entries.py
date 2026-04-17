"""
Seed de datos de prueba para el Time Tracking Service.
Crea entradas de tiempo vinculadas a los casos del Matter Service seed.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.time_tracking.models import TimeEntry

# UUIDs del seed del IAM Service (abogados)
LAWYER_1 = "00000000-0000-0000-0000-000000000001"
LAWYER_2 = "00000000-0000-0000-0000-000000000002"

# UUIDs de casos del seed del Matter Service
CASE_GARCIA   = "11111111-1111-1111-1111-111111111111"
CASE_HERENCIA = "22222222-2222-2222-2222-222222222222"
CASE_TECHSTART = "33333333-3333-3333-3333-333333333333"
CASE_FUSION   = "44444444-4444-4444-4444-444444444444"

ENTRIES = [
    # Caso García — abogado 1
    dict(case_id=CASE_GARCIA, case_number="EXP-2024-001", user_id=LAWYER_1, user_name="Ana García",
         task_type="research", description="Revisión del contrato de obra y búsqueda de jurisprudencia aplicable.",
         date=date.today() - timedelta(days=10), duration_minutes=120, is_billable=True, hourly_rate="150.00"),
    dict(case_id=CASE_GARCIA, case_number="EXP-2024-001", user_id=LAWYER_1, user_name="Ana García",
         task_type="drafting", description="Redacción de la demanda inicial y anexos.",
         date=date.today() - timedelta(days=7), duration_minutes=180, is_billable=True, hourly_rate="150.00"),
    dict(case_id=CASE_GARCIA, case_number="EXP-2024-001", user_id=LAWYER_1, user_name="Ana García",
         task_type="client_meeting", description="Reunión con el cliente para revisión de la estrategia procesal.",
         date=date.today() - timedelta(days=5), duration_minutes=60, is_billable=True, hourly_rate="150.00"),
    dict(case_id=CASE_GARCIA, case_number="EXP-2024-001", user_id=LAWYER_1, user_name="Ana García",
         task_type="court", description="Presentación de la demanda en el juzgado.",
         date=date.today() - timedelta(days=3), duration_minutes=90, is_billable=True, hourly_rate="150.00"),

    # Caso Herencia — abogado 1
    dict(case_id=CASE_HERENCIA, case_number="EXP-2024-002", user_id=LAWYER_1, user_name="Ana García",
         task_type="research", description="Análisis del testamento y documentación de bienes.",
         date=date.today() - timedelta(days=8), duration_minutes=150, is_billable=True, hourly_rate="150.00"),
    dict(case_id=CASE_HERENCIA, case_number="EXP-2024-002", user_id=LAWYER_1, user_name="Ana García",
         task_type="drafting", description="Redacción del escrito de aceptación de herencia.",
         date=date.today() - timedelta(days=4), duration_minutes=90, is_billable=True, hourly_rate="150.00"),

    # Caso TechStart — abogado 2
    dict(case_id=CASE_TECHSTART, case_number="EXP-2024-003", user_id=LAWYER_2, user_name="Carlos Ruiz",
         task_type="review", description="Revisión del expediente de despido y cálculo de indemnización.",
         date=date.today() - timedelta(days=6), duration_minutes=120, is_billable=True, hourly_rate="180.00"),
    dict(case_id=CASE_TECHSTART, case_number="EXP-2024-003", user_id=LAWYER_2, user_name="Carlos Ruiz",
         task_type="negotiation", description="Negociación con la empresa demandada para acuerdo extrajudicial.",
         date=date.today() - timedelta(days=2), duration_minutes=120, is_billable=True, hourly_rate="180.00"),
    dict(case_id=CASE_TECHSTART, case_number="EXP-2024-003", user_id=LAWYER_2, user_name="Carlos Ruiz",
         task_type="client_meeting", description="Reunión con los 3 empleados afectados.",
         date=date.today() - timedelta(days=1), duration_minutes=90, is_billable=True, hourly_rate="180.00"),

    # Caso Fusión — abogado 2 (cerrado, algunas no facturables)
    dict(case_id=CASE_FUSION, case_number="EXP-2023-089", user_id=LAWYER_2, user_name="Carlos Ruiz",
         task_type="research", description="Due diligence legal de ambas empresas.",
         date=date.today() - timedelta(days=30), duration_minutes=480, is_billable=True, hourly_rate="200.00"),
    dict(case_id=CASE_FUSION, case_number="EXP-2023-089", user_id=LAWYER_2, user_name="Carlos Ruiz",
         task_type="drafting", description="Redacción del contrato de fusión y escisión.",
         date=date.today() - timedelta(days=25), duration_minutes=360, is_billable=True, hourly_rate="200.00"),
    dict(case_id=CASE_FUSION, case_number="EXP-2023-089", user_id=LAWYER_2, user_name="Carlos Ruiz",
         task_type="admin", description="Coordinación con notaría y registro mercantil.",
         date=date.today() - timedelta(days=20), duration_minutes=60, is_billable=False, hourly_rate=None),
]


class Command(BaseCommand):
    help = "Crea entradas de tiempo de prueba para desarrollo"

    def handle(self, *args, **options):
        if TimeEntry.objects.exists():
            self.stdout.write(self.style.WARNING("Ya existen entradas de tiempo — omitiendo seed."))
            return

        created = 0
        for data in ENTRIES:
            TimeEntry.objects.create(**data)
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Seed completado: {created} entradas de tiempo creadas."))
