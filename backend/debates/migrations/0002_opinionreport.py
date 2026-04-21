from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("debates", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OpinionReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("resolved", models.BooleanField(default=False)),
                (
                    "opinion",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="debates.opinion"),
                ),
                (
                    "reporter",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="opinion_reports", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="opinionreport",
            index=models.Index(fields=["resolved", "created_at"], name="debates_opi_resolve_a24531_idx"),
        ),
        migrations.AddConstraint(
            model_name="opinionreport",
            constraint=models.UniqueConstraint(
                fields=("opinion", "reporter"),
                name="unique_report_per_user_per_opinion",
            ),
        ),
    ]
