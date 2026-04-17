import uuid
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.matters.models import Case, CaseParty, CaseDate, CaseActivityLog


# UUIDs fijos para datos de prueba reproducibles
LAWYER_UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")
CLIENT_UUID_1 = uuid.UUID("00000000-0000-0000-0000-000000000002")
CLIENT_UUID_2 = uuid.UUID("00000000-0000-0000-0000-000000000003")
CLIENT_UUID_3 = uuid.UUID("00000000-0000-0000-0000-000000000004")
ADMIN_UUID = uuid.UUID("00000000-0000-0000-0000-000000000099")

SAMPLE_CASES = [
    {
        "case_number": "EXP-2024-001",
        "title": "García vs. Constructora Ibérica S.L. — Incumplimiento de contrato",
        "description": "Demanda por incumplimiento de contrato de obra. El cliente contrató a la constructora para la reforma integral de un local comercial, sin que se completara la obra en el plazo pactado.",
        "case_type": "civil",
        "status": "in_progress",
        "jurisdiction": "Juzgado de Primera Instancia nº 5 — Madrid",
        "court": "Tribunal Civil de Madrid",
        "assigned_lawyer_id": LAWYER_UUID,
        "client_id": CLIENT_UUID_1,
        "opened_at": date(2024, 3, 15),
        "is_urgent": False,
        "tags": ["contrato", "obra", "incumplimiento"],
        "notes": "Cliente muy implicado. Reuniones quincenales.",
        "parties": [
            {
                "full_name": "Antonio García Martínez",
                "role": "client",
                "email": "antonio.garcia@email.com",
                "phone": "+34 612 345 678",
                "identification": "12345678A",
            },
            {
                "full_name": "Constructora Ibérica S.L.",
                "role": "opposing_party",
                "email": "legal@constructora-iberica.es",
                "phone": "+34 91 234 5678",
                "identification": "B87654321",
            },
            {
                "full_name": "Dra. Carmen López Ruiz",
                "role": "expert",
                "email": "carmen.lopez@peritos.es",
                "phone": "+34 622 111 222",
                "notes": "Perito de obra civil designado por el juzgado",
            },
        ],
        "dates": [
            {
                "title": "Audiencia previa",
                "date_type": "hearing",
                "scheduled_date": timezone.now() + timedelta(days=15),
                "is_critical": True,
                "notes": "Preparar informe pericial antes de esta fecha",
            },
            {
                "title": "Plazo para contestar demanda",
                "date_type": "deadline",
                "scheduled_date": timezone.now() + timedelta(days=8),
                "is_critical": True,
            },
        ],
    },
    {
        "case_number": "EXP-2024-002",
        "title": "Herencia López — Partición de bienes",
        "description": "Procedimiento de división de herencia entre tres herederos. Inmueble en Madrid y cuenta bancaria en disputa.",
        "case_type": "civil",
        "status": "open",
        "jurisdiction": "Juzgado de Primera Instancia nº 12 — Madrid",
        "court": "Tribunal Civil de Madrid",
        "assigned_lawyer_id": LAWYER_UUID,
        "client_id": CLIENT_UUID_2,
        "opened_at": date(2024, 6, 1),
        "is_urgent": False,
        "tags": ["herencia", "familia", "inmueble"],
        "notes": "Tres herederos: dos conformes, uno en disputa.",
        "parties": [
            {
                "full_name": "María López Fernández",
                "role": "client",
                "email": "maria.lopez@email.com",
                "phone": "+34 634 567 890",
                "identification": "98765432B",
            },
            {
                "full_name": "Pedro López Fernández",
                "role": "opposing_party",
                "email": "pedro.lopez@email.com",
                "phone": "+34 645 678 901",
                "identification": "87654321C",
            },
        ],
        "dates": [
            {
                "title": "Reunión de mediación familiar",
                "date_type": "meeting",
                "scheduled_date": timezone.now() + timedelta(days=30),
                "is_critical": False,
            },
        ],
    },
    {
        "case_number": "EXP-2024-003",
        "title": "Empresa TechStart S.L. — Reclamación laboral",
        "description": "Despido improcedente de trabajadora con 8 años de antigüedad. Reclamación de indemnización máxima y salarios pendientes.",
        "case_type": "labor",
        "status": "in_progress",
        "jurisdiction": "Juzgado de lo Social nº 3 — Barcelona",
        "court": "Tribunal Social de Barcelona",
        "assigned_lawyer_id": LAWYER_UUID,
        "client_id": CLIENT_UUID_3,
        "opened_at": date(2024, 9, 10),
        "is_urgent": True,
        "tags": ["laboral", "despido", "urgente"],
        "notes": "URGENTE: La trabajadora lleva 3 meses sin cobrar. Solicitar medidas cautelares.",
        "parties": [
            {
                "full_name": "Elena Martínez Soto",
                "role": "client",
                "email": "elena.martinez@email.com",
                "phone": "+34 655 789 012",
                "identification": "76543210D",
            },
            {
                "full_name": "TechStart S.L.",
                "role": "opposing_party",
                "email": "rrhh@techstart.es",
                "phone": "+34 93 345 6789",
                "identification": "B12345678",
            },
        ],
        "dates": [
            {
                "title": "Acto de conciliación previa",
                "date_type": "hearing",
                "scheduled_date": timezone.now() + timedelta(days=5),
                "is_critical": True,
                "notes": "Preparar propuesta de acuerdo extrajudicial",
            },
            {
                "title": "Juicio oral",
                "date_type": "trial",
                "scheduled_date": timezone.now() + timedelta(days=45),
                "is_critical": True,
            },
        ],
    },
    {
        "case_number": "EXP-2023-045",
        "title": "Fusión empresarial Omega Corp & Delta S.A.",
        "description": "Asesoramiento legal completo en proceso de fusión por absorción. Revisión de due diligence, contratos y cumplimiento regulatorio.",
        "case_type": "corporate",
        "status": "closed",
        "jurisdiction": "Registro Mercantil de Madrid",
        "court": "N/A — Procedimiento extrajudicial",
        "assigned_lawyer_id": LAWYER_UUID,
        "client_id": CLIENT_UUID_1,
        "opened_at": date(2023, 5, 1),
        "closed_at": date(2024, 1, 31),
        "is_urgent": False,
        "tags": ["corporativo", "fusión", "mercantil"],
        "notes": "Caso cerrado exitosamente. Fusión completada en enero 2024.",
        "parties": [
            {
                "full_name": "Omega Corporation S.A.",
                "role": "client",
                "email": "legal@omegacorp.es",
                "phone": "+34 91 567 8901",
                "identification": "A11223344",
            },
            {
                "full_name": "Delta S.A.",
                "role": "opposing_party",
                "email": "legal@delta.es",
                "phone": "+34 91 678 9012",
                "identification": "A44332211",
            },
        ],
        "dates": [],
    },
]


class Command(BaseCommand):
    help = "Genera datos de prueba para el Matter Service (casos, partes, fechas)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Eliminar todos los casos existentes antes de crear los de prueba",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = Case.objects.count()
            Case.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"  {count} casos eliminados."))

        self.stdout.write("Creando datos de prueba para el Matter Service...")

        created_count = 0
        for case_data in SAMPLE_CASES:
            parties_data = case_data.pop("parties", [])
            dates_data = case_data.pop("dates", [])

            case, created = Case.objects.get_or_create(
                case_number=case_data["case_number"],
                defaults={**case_data, "created_by": ADMIN_UUID},
            )

            verb = "creado" if created else "ya existe"
            self.stdout.write(f"  [{case.case_number}] {case.title[:50]}... {verb}")

            if created:
                created_count += 1

                # Crear partes
                for party_data in parties_data:
                    CaseParty.objects.create(case=case, **party_data)

                # Crear fechas
                for date_data in dates_data:
                    CaseDate.objects.create(
                        case=case,
                        created_by=ADMIN_UUID,
                        **date_data,
                    )

                # Registrar en log de actividad
                CaseActivityLog.objects.create(
                    case=case,
                    activity_type=CaseActivityLog.ActivityType.CREATED,
                    user_id=ADMIN_UUID,
                    description=f"Caso creado mediante seed de datos de prueba",
                    new_value={"case_number": case.case_number, "title": case.title},
                )

        self.stdout.write(self.style.SUCCESS(
            f"\n{created_count} casos creados con éxito. "
            f"Total en base de datos: {Case.objects.count()}"
        ))
