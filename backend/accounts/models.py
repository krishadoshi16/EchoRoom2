from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        REGISTERED = "registered", "Registered"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.REGISTERED,
        db_index=True,
    )

    # SRS: admin can suspend or ban users.
    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)

    is_banned = models.BooleanField(default=False)
    banned_at = models.DateTimeField(null=True, blank=True)

    # Require email for registration / account management.
    email = models.EmailField("email address", unique=True, blank=False)

    def save(self, *args, **kwargs):
        # Keep Django auth "active" state aligned with ban status.
        self.is_active = not self.is_banned

        if self.is_banned and self.banned_at is None:
            self.banned_at = timezone.now()
        if not self.is_banned:
            self.banned_at = None

        if self.is_suspended and self.suspended_at is None:
            self.suspended_at = timezone.now()
        if not self.is_suspended:
            self.suspended_at = None

        # Role -> admin access for the Django admin + protected APIs.
        if self.is_superuser:
            self.is_staff = True
        else:
            self.is_staff = self.role == self.Role.ADMIN

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.username

