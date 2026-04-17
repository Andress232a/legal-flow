from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Case


@receiver(pre_save, sender=Case)
def track_status_change(sender, instance, **kwargs):
    """Almacena el estado previo para auditoría antes de guardar."""
    if instance.pk:
        try:
            instance._previous_status = Case.objects.get(pk=instance.pk).status
        except Case.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None
