from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from debates.models import Category, DebateTopic, OpinionReport


User = get_user_model()


class AdminStatsSerializer(serializers.Serializer):
    pending_topics = serializers.IntegerField()
    pending_categories = serializers.IntegerField()
    approved_topics = serializers.IntegerField()
    approved_categories = serializers.IntegerField()
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()


class AdminPendingTopicSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name")
    author = serializers.CharField(source="created_by.username")
    submittedAt = serializers.DateTimeField(source="created_at")

    class Meta:
        model = DebateTopic
        fields = ("id", "title", "category", "author", "submittedAt")


class AdminRecentOpinionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    author = serializers.CharField()
    debate = serializers.CharField()
    content = serializers.CharField()
    createdAt = serializers.DateTimeField()
    reportCount = serializers.IntegerField()
    reason = serializers.CharField()


class AdminUserSerializer(serializers.ModelSerializer):
    debates = serializers.IntegerField()
    status = serializers.CharField()
    roleLabel = serializers.CharField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "roleLabel", "debates", "status")


class AdminSetUserStatusSerializer(serializers.Serializer):
    value = serializers.BooleanField()


class AdminCategorySerializer(serializers.ModelSerializer):
    suggestedBy = serializers.SerializerMethodField()
    status = serializers.CharField()

    class Meta:
        model = Category
        fields = ("id", "name", "description", "status", "suggestedBy", "created_at")

    def get_suggestedBy(self, obj: Category):
        if not obj.suggested_by_id:
            return None
        return obj.suggested_by.username


class AdminCreateCategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_name(self, value: str) -> str:
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("name cannot be empty")
        return name

    def validate_description(self, value: str) -> str:
        return (value or "").strip()


class AdminUpdateCategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_name(self, value: str) -> str:
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("name cannot be empty")
        return name

    def validate_description(self, value: str) -> str:
        return (value or "").strip()

