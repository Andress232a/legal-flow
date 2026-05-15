import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="billing.mark_overdue_invoices")
def mark_overdue_invoices():
    """
    Revisa facturas en estado 'sent' cuya fecha de vencimiento ya pasó
    y las marca como 'overdue'. Debe ejecutarse diariamente via Celery Beat.
    """
    from apps.billing.models import Invoice

    today = timezone.now().date()
    updated = Invoice.objects.filter(
        status=Invoice.Status.SENT,
        due_date__lt=today,
    ).update(status=Invoice.Status.OVERDUE)

    logger.info("mark_overdue_invoices: %d facturas marcadas como vencidas", updated)
    return {"marked_overdue": updated}


@shared_task(name="billing.auto_invoice_from_case_closed")
def auto_invoice_from_case_closed(case_id: str, client_id: str, lawyer_id: str,
                                   case_number: str, client_name: str):
    """
    Genera automáticamente una factura borrador cuando un caso es cerrado.
    Usa la FeeStructure del caso si existe.
    """
    from apps.billing.models import Invoice, InvoiceItem, FeeStructure
    from decimal import Decimal
    from django.utils import timezone
    import uuid

    today = timezone.now().date()
    due = today.replace(day=today.day)

    try:
        fee = FeeStructure.objects.get(case_id=case_id)
    except FeeStructure.DoesNotExist:
        fee = None

    # Calcula monto según estructura de honorarios
    if fee:
        amount = fee.calculate_amount()
        description = f"Honorarios ({fee.get_fee_type_display()}) — {case_number}"
        if fee.fee_type == FeeStructure.FeeType.HOURLY:
            description = f"Honorarios por hora — {case_number} (revisar horas registradas)"
    else:
        amount = Decimal("0.00")
        description = f"Honorarios profesionales — {case_number}"

    # Número de factura
    year = today.year
    last = Invoice.objects.filter(
        invoice_number__startswith=f"FAC-{year}-"
    ).order_by("-invoice_number").first()
    if last:
        try:
            seq = int(last.invoice_number.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1

    # Fecha de vencimiento: 30 días desde hoy
    import datetime
    due_date = today + datetime.timedelta(days=30)

    invoice = Invoice.objects.create(
        invoice_number=f"FAC-{year}-{seq:04d}",
        case_id=case_id,
        client_id=client_id,
        lawyer_id=lawyer_id,
        created_by=uuid.UUID(lawyer_id) if lawyer_id else uuid.uuid4(),
        status=Invoice.Status.DRAFT,
        issue_date=today,
        due_date=due_date,
        case_number=case_number,
        client_name=client_name,
        notes="Factura generada automáticamente al cierre del caso.",
    )

    if amount > Decimal("0"):
        InvoiceItem.objects.create(
            invoice=invoice,
            description=description,
            quantity=Decimal("1.00"),
            unit_price=amount,
        )
        invoice.recalculate()

    logger.info(
        "auto_invoice_from_case_closed: factura %s creada para caso %s",
        invoice.invoice_number, case_number,
    )
    return {"invoice_id": str(invoice.id), "invoice_number": invoice.invoice_number}
