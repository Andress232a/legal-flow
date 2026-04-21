"""
Management command: sincroniza CaseDates existentes que no tienen calendar_event_id
con el Calendar Service.

Uso:
    python manage.py sync_calendar_events
    python manage.py sync_calendar_events --dry-run
"""
from django.core.management.base import BaseCommand
from apps.matters.models import CaseDate


class Command(BaseCommand):
    help = "Sincroniza CaseDates sin calendar_event_id con el Calendar Service"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra qué se sincronizaría sin hacer cambios",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        pending = CaseDate.objects.filter(calendar_event_id__isnull=True).select_related("case")

        self.stdout.write(f"CaseDates sin sincronizar: {pending.count()}")

        if dry_run:
            for cd in pending:
                self.stdout.write(f"  [DRY] {cd.case.case_number} — {cd.title} ({cd.scheduled_date})")
            return

        from apps.matters.calendar_client import create_calendar_event

        ok = 0
        failed = 0
        for cd in pending:
            event_id = create_calendar_event(cd, cd.case.assigned_lawyer_id)
            if event_id:
                cd.calendar_event_id = event_id
                cd.save(update_fields=["calendar_event_id"])
                self.stdout.write(self.style.SUCCESS(
                    f"  OK  {cd.case.case_number} — {cd.title} → {event_id}"
                ))
                ok += 1
            else:
                self.stdout.write(self.style.ERROR(
                    f"  FAIL {cd.case.case_number} — {cd.title}"
                ))
                failed += 1

        self.stdout.write(f"\nResultado: {ok} sincronizados, {failed} fallidos.")
