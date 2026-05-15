import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PortalMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("case_id", models.UUIDField(db_index=True)),
                ("sender_id", models.UUIDField(db_index=True)),
                ("recipient_id", models.UUIDField(db_index=True)),
                ("body", models.TextField()),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "portal_messages",
                "ordering": ["-created_at"],
            },
        ),
    ]
