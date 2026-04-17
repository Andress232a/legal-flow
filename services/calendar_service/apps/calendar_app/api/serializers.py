from rest_framework import serializers
from apps.calendar_app.models import CalendarEvent, EventReminder


class EventReminderSerializer(serializers.ModelSerializer):
    remind_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = EventReminder
        fields = ("id", "remind_before_value", "remind_before_unit", "is_sent", "sent_at", "remind_at")
        read_only_fields = ("id", "is_sent", "sent_at")


class CalendarEventListSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    reminders_count = serializers.IntegerField(source="reminders.count", read_only=True)

    class Meta:
        model = CalendarEvent
        fields = (
            "id", "title", "event_type", "event_type_display", "priority", "priority_display",
            "start_datetime", "end_datetime", "all_day", "location",
            "case_id", "case_number", "assigned_to",
            "is_legal_deadline", "is_completed", "completed_at",
            "reminders_count", "created_at",
        )
        read_only_fields = ("id", "created_at")


class CalendarEventDetailSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    reminders = EventReminderSerializer(many=True, read_only=True)

    class Meta:
        model = CalendarEvent
        fields = (
            "id", "title", "description", "event_type", "event_type_display",
            "priority", "priority_display",
            "start_datetime", "end_datetime", "all_day", "location",
            "case_id", "case_date_id", "case_number", "assigned_to", "created_by",
            "is_legal_deadline", "is_completed", "completed_at",
            "reminders", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    reminders = EventReminderSerializer(many=True, required=False)

    class Meta:
        model = CalendarEvent
        fields = (
            "id", "title", "description", "event_type", "priority",
            "start_datetime", "end_datetime", "all_day", "location",
            "case_id", "case_date_id", "case_number", "assigned_to",
            "is_legal_deadline", "reminders",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        if attrs.get("end_datetime") and attrs["end_datetime"] < attrs["start_datetime"]:
            raise serializers.ValidationError({"end_datetime": "La fecha de fin debe ser posterior al inicio."})
        return attrs

    def create(self, validated_data):
        reminders_data = validated_data.pop("reminders", [])
        event = CalendarEvent.objects.create(**validated_data)
        for r in reminders_data:
            EventReminder.objects.create(event=event, **r)
        return event


class CalendarEventUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = (
            "title", "description", "event_type", "priority",
            "start_datetime", "end_datetime", "all_day", "location",
            "case_number", "assigned_to", "is_legal_deadline",
        )

    def validate(self, attrs):
        instance = self.instance
        start = attrs.get("start_datetime", instance.start_datetime if instance else None)
        end = attrs.get("end_datetime", instance.end_datetime if instance else None)
        if end and start and end < start:
            raise serializers.ValidationError({"end_datetime": "La fecha de fin debe ser posterior al inicio."})
        return attrs


class CalendarStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    upcoming = serializers.IntegerField()
    overdue = serializers.IntegerField()
    completed = serializers.IntegerField()
    legal_deadlines = serializers.IntegerField()
    critical = serializers.IntegerField()
    by_type = serializers.DictField()
