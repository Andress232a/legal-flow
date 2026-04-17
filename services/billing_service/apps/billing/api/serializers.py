from rest_framework import serializers
from apps.billing.models import Invoice, InvoiceItem, Payment
from decimal import Decimal


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ("id", "invoice", "time_entry_id", "description", "quantity", "unit_price", "amount")
        read_only_fields = ("id", "amount", "invoice")


class InvoiceItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ("id", "time_entry_id", "description", "quantity", "unit_price", "amount")
        read_only_fields = ("id", "amount")


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "invoice", "amount", "method", "method_display",
            "payment_date", "reference", "notes", "registered_by", "created_at",
        )
        read_only_fields = ("id", "registered_by", "created_at", "invoice")


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("id", "amount", "method", "payment_date", "reference", "notes")
        read_only_fields = ("id",)


class InvoiceListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "case_id", "client_id", "lawyer_id",
            "status", "status_display", "issue_date", "due_date",
            "subtotal", "tax_rate", "tax_amount", "total", "amount_paid",
            "balance_due", "items_count", "case_number", "client_name",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "invoice_number", "created_at", "updated_at")


class InvoiceDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "case_id", "client_id", "lawyer_id", "created_by",
            "status", "status_display", "issue_date", "due_date",
            "subtotal", "tax_rate", "tax_amount", "total", "amount_paid",
            "balance_due", "notes", "case_number", "client_name",
            "items", "payments", "created_at", "updated_at",
        )
        read_only_fields = ("id", "invoice_number", "created_by", "created_at", "updated_at")


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "case_id", "client_id", "lawyer_id",
            "issue_date", "due_date", "tax_rate", "notes",
            "case_number", "client_name", "items",
        )
        read_only_fields = ("id", "invoice_number")

    def create(self, validated_data):
        from django.utils import timezone
        items_data = validated_data.pop("items", [])
        year = timezone.now().year
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
        validated_data["invoice_number"] = f"FAC-{year}-{seq:04d}"
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        invoice.recalculate()
        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ("status", "due_date", "tax_rate", "notes", "client_name", "case_number")

    def validate_status(self, value):
        instance = self.instance
        if instance and instance.status == Invoice.Status.CANCELLED:
            raise serializers.ValidationError("No se puede modificar una factura cancelada.")
        return value


class InvoiceStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    draft = serializers.IntegerField()
    sent = serializers.IntegerField()
    paid = serializers.IntegerField()
    overdue = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    total_billed = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_pending = serializers.DecimalField(max_digits=14, decimal_places=2)
