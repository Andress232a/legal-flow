from rest_framework import serializers

from apps.portal.models import PortalMessage


class PortalMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalMessage
        fields = [
            "id",
            "case_id",
            "sender_id",
            "recipient_id",
            "body",
            "read_at",
            "created_at",
        ]
        read_only_fields = ["id", "sender_id", "read_at", "created_at"]


class PortalMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalMessage
        fields = ["case_id", "recipient_id", "body"]

    def validate(self, attrs):
        if attrs["recipient_id"] == self.context["request"].user.id:
            raise serializers.ValidationError("El destinatario no puede ser usted mismo.")
        return attrs
