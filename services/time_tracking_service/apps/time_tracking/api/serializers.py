from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from apps.time_tracking.models import TimeEntry, Timer


class TimeEntrySerializer(serializers.ModelSerializer):
    duration_hours = serializers.SerializerMethodField()
    billable_amount = serializers.SerializerMethodField()
    task_type_display = serializers.CharField(source="get_task_type_display", read_only=True)

    @extend_schema_field(serializers.FloatField())
    def get_duration_hours(self, obj):
        return obj.duration_hours

    @extend_schema_field(serializers.FloatField())
    def get_billable_amount(self, obj):
        return obj.billable_amount

    class Meta:
        model = TimeEntry
        fields = [
            "id", "case_id", "case_number", "user_id", "user_name",
            "task_type", "task_type_display", "description",
            "date", "duration_minutes", "duration_hours",
            "is_billable", "hourly_rate", "billable_amount",
            "created_from_timer", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_from_timer", "created_at", "updated_at"]

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("La duración debe ser mayor a 0 minutos.")
        if value > 1440:
            raise serializers.ValidationError("La duración no puede superar 24 horas (1440 min).")
        return value


class TimeEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeEntry
        fields = [
            "case_id", "case_number", "task_type", "description",
            "date", "duration_minutes", "is_billable", "hourly_rate",
        ]

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("La duración debe ser mayor a 0 minutos.")
        if value > 1440:
            raise serializers.ValidationError("La duración no puede superar 24 horas (1440 min).")
        return value


class TimerSerializer(serializers.ModelSerializer):
    elapsed_seconds = serializers.SerializerMethodField()
    elapsed_minutes = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    task_type_display = serializers.CharField(source="get_task_type_display", read_only=True)

    @extend_schema_field(serializers.IntegerField())
    def get_elapsed_seconds(self, obj):
        return obj.elapsed_seconds

    @extend_schema_field(serializers.IntegerField())
    def get_elapsed_minutes(self, obj):
        return obj.elapsed_minutes

    class Meta:
        model = Timer
        fields = [
            "id", "case_id", "case_number", "user_id",
            "task_type", "task_type_display", "description", "is_billable",
            "status", "status_display",
            "started_at", "paused_at", "stopped_at",
            "accumulated_seconds", "elapsed_seconds", "elapsed_minutes",
            "created_at",
        ]
        read_only_fields = [
            "id", "user_id", "status", "started_at", "paused_at",
            "stopped_at", "accumulated_seconds", "created_at",
        ]


class TimerStartSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    case_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    task_type = serializers.ChoiceField(choices=TimeEntry.TASK_TYPE_CHOICES, default="other")
    description = serializers.CharField(required=False, allow_blank=True)
    is_billable = serializers.BooleanField(default=True)


class TimeStatsSerializer(serializers.Serializer):
    total_entries = serializers.IntegerField()
    total_minutes = serializers.IntegerField()
    total_hours = serializers.FloatField()
    billable_minutes = serializers.IntegerField()
    billable_hours = serializers.FloatField()
    billable_amount = serializers.FloatField()
    entries_by_task_type = serializers.DictField()
    entries_by_case = serializers.ListField()
    active_timer = TimerSerializer(allow_null=True)
