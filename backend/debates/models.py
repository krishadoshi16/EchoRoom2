from __future__ import annotations

from django.conf import settings
from django.db import models


class Category(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    # Admin-managed categories; user can suggest a new one.
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)

    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="category_suggestions",
    )
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="moderated_categories",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    def __str__(self) -> str:
        return self.name


class DebateTopic(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="debate_topics")
    title = models.CharField(max_length=250)
    description = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_debate_topics",
    )

    # SRS: Newly created topics are submitted for admin review, and only published after approval.
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="moderated_debate_topics",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status", "category"])]

    def __str__(self) -> str:
        return self.title


class Opinion(models.Model):
    class Stance(models.TextChoices):
        FOR = "for", "For"
        AGAINST = "against", "Against"

    debate = models.ForeignKey(DebateTopic, on_delete=models.CASCADE, related_name="opinions")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="opinions")

    stance = models.CharField(max_length=10, choices=Stance.choices, db_index=True)
    content = models.TextField()

    # SRS: single-level replies only (enforced in serializer/business logic).
    parent_opinion = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["debate", "stance"])]

    def __str__(self) -> str:
        return f"{self.author_id} {self.stance}"


class Vote(models.Model):
    class Value(models.IntegerChoices):
        DOWN = -1, "Down"
        UP = 1, "Up"

    opinion = models.ForeignKey(Opinion, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votes")

    value = models.SmallIntegerField(choices=Value.choices)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "opinion"], name="unique_vote_per_user_per_opinion")
        ]
        indexes = [models.Index(fields=["user", "value"])]

    def __str__(self) -> str:
        return f"Vote({self.user_id}, {self.opinion_id})={self.value}"


class OpinionReport(models.Model):
    opinion = models.ForeignKey(Opinion, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="opinion_reports",
    )
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["opinion", "reporter"],
                name="unique_report_per_user_per_opinion",
            )
        ]
        indexes = [models.Index(fields=["resolved", "created_at"])]

    def __str__(self) -> str:
        return f"Report({self.reporter_id}->{self.opinion_id})"

