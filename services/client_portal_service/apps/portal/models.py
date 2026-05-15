import uuid

from django.db import models


class PortalMessage(models.Model):
    """Mensaje seguro entre cliente y bufete vinculado a un caso."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_id = models.UUIDField(db_index=True)
    sender_id = models.UUIDField(db_index=True)
    recipient_id = models.UUIDField(db_index=True)
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "portal_messages"
        ordering = ["-created_at"]

    def __str__(self):
        return f"PortalMessage(case={self.case_id}, {self.sender_id}→{self.recipient_id})"
