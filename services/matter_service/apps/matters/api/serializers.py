from rest_framework import serializers
from apps.matters.models import Case, CaseParty, CaseDate, CaseActivityLog


class CasePartySerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = CaseParty
        fields = (
            "id", "case", "full_name", "role", "role_display",
            "email", "phone", "identification", "address",
            "notes", "user_id", "created_at",
        )
        read_only_fields = ("id", "created_at")


class CasePartyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseParty
        fields = (
            "id", "full_name", "role", "email", "phone",
            "identification", "address", "notes", "user_id",
        )
        read_only_fields = ("id",)


class CaseDateSerializer(serializers.ModelSerializer):
    date_type_display = serializers.CharField(source="get_date_type_display", read_only=True)

    class Meta:
        model = CaseDate
        fields = (
            "id", "case", "title", "description", "date_type", "date_type_display",
            "scheduled_date", "is_critical", "is_completed", "completed_at",
            "notes", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CaseDateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseDate
        fields = (
            "id", "title", "description", "date_type",
            "scheduled_date", "is_critical", "notes",
        )
        read_only_fields = ("id",)


class CaseActivityLogSerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source="get_activity_type_display", read_only=True)

    class Meta:
        model = CaseActivityLog
        fields = (
            "id", "case", "activity_type", "activity_type_display",
            "user_id", "description", "old_value", "new_value",
            "ip_address", "timestamp",
        )
        read_only_fields = ("id", "timestamp")


class CaseListSerializer(serializers.ModelSerializer):
    case_type_display = serializers.CharField(source="get_case_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    parties_count = serializers.IntegerField(source="parties.count", read_only=True)
    upcoming_dates_count = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = (
            "id", "case_number", "title", "case_type", "case_type_display",
            "status", "status_display", "jurisdiction", "court",
            "assigned_lawyer_id", "client_id", "opened_at", "closed_at",
            "is_urgent", "tags", "parties_count", "upcoming_dates_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_upcoming_dates_count(self, obj):
        from django.utils import timezone
        return obj.dates.filter(
            scheduled_date__gte=timezone.now(),
            is_completed=False,
        ).count()


class CaseDetailSerializer(serializers.ModelSerializer):
    case_type_display = serializers.CharField(source="get_case_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    parties = CasePartySerializer(many=True, read_only=True)
    dates = CaseDateSerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = (
            "id", "case_number", "title", "description",
            "case_type", "case_type_display", "status", "status_display",
            "jurisdiction", "court", "assigned_lawyer_id", "client_id",
            "opened_at", "closed_at", "is_urgent", "tags", "notes",
            "parties", "dates", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CaseCreateSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(read_only=True)

    class Meta:
        model = Case
        fields = (
            "id", "case_number", "title", "description",
            "case_type", "status", "jurisdiction", "court",
            "assigned_lawyer_id", "client_id", "opened_at",
            "is_urgent", "tags", "notes",
        )
        read_only_fields = ("id", "case_number")

    def create(self, validated_data):
        from django.utils import timezone
        year = timezone.now().year
        prefix = f"EXP-{year}-"
        existing = Case.objects.filter(case_number__icontains=f"-{year}-").values_list("case_number", flat=True)
        max_seq = 0
        for cn in existing:
            try:
                parts = cn.upper().split("-")
                if len(parts) == 3 and parts[1] == str(year):
                    seq = int(parts[2])
                    if seq > max_seq:
                        max_seq = seq
            except (ValueError, IndexError):
                pass
        validated_data["case_number"] = f"{prefix}{max_seq + 1:03d}"
        return super().create(validated_data)


class CaseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = (
            "title", "description", "case_type", "status",
            "jurisdiction", "court", "assigned_lawyer_id",
            "opened_at", "closed_at", "is_urgent", "tags", "notes",
        )

    def validate(self, attrs):
        # Si se cierra el caso, se debe registrar la fecha de cierre
        if attrs.get("status") == Case.CaseStatus.CLOSED and not attrs.get("closed_at"):
            from django.utils import timezone
            attrs["closed_at"] = timezone.now().date()
        return attrs


class CaseStatusChangeSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Case.CaseStatus.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
