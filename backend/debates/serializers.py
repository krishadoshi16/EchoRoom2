from __future__ import annotations

from rest_framework import serializers

from .models import Category, DebateTopic, Opinion, Vote


_CATEGORY_META: dict[str, dict[str, str]] = {
    # Matches the frontend's hardcoded colors/icons (best-effort).
    "Technology": {"color": "#00f5d4", "icon": "💻"},
    "Politics": {"color": "#ff6b6b", "icon": "🏛️"},
    "Science": {"color": "#a29bfe", "icon": "🔬"},
    "Education": {"color": "#fdcb6e", "icon": "📚"},
    "Environment": {"color": "#55efc4", "icon": "🌍"},
    "Society": {"color": "#fd79a8", "icon": "👥"},
    "Economy": {"color": "#e17055", "icon": "📈"},
    "Health": {"color": "#00cec9", "icon": "🏥"},
}


class CategoryPublicSerializer(serializers.ModelSerializer):
    color = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()
    debates = serializers.IntegerField()

    class Meta:
        model = Category
        fields = ("name", "description", "color", "icon", "debates")

    def get_color(self, obj: Category) -> str:
        return _CATEGORY_META.get(obj.name, {}).get("color", "#ffffff")

    def get_icon(self, obj: Category) -> str:
        return _CATEGORY_META.get(obj.name, {}).get("icon", "💬")


class DebateTopicPublicListSerializer(serializers.ModelSerializer):
    """
    Visitor list serializer for approved debate topics.
    Matches the frontend's expected fields (best-effort).
    """

    category = serializers.CharField(source="category.name")
    categoryColor = serializers.SerializerMethodField()

    # Annotated in queryset.
    for_votes = serializers.IntegerField()
    against_votes = serializers.IntegerField()
    opinions = serializers.IntegerField(source="opinions_count")

    hot = serializers.SerializerMethodField()
    timeAgo = serializers.SerializerMethodField()

    class Meta:
        model = DebateTopic
        fields = (
            "id",
            "category",
            "categoryColor",
            "title",
            "for_votes",
            "against_votes",
            "opinions",
            "hot",
            "timeAgo",
        )

    def get_categoryColor(self, obj: DebateTopic) -> str:
        return _CATEGORY_META.get(obj.category.name, {}).get("color", "#ffffff")

    def _age_minutes(self, obj: DebateTopic) -> int:
        # Use serializer time computations to avoid DB functions.
        from django.utils import timezone

        delta = timezone.now() - obj.created_at
        return int(delta.total_seconds() // 60)

    def get_timeAgo(self, obj: DebateTopic) -> str:
        minutes = self._age_minutes(obj)
        if minutes < 60:
            return f"{minutes}m ago" if minutes > 1 else "1m ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours}h ago" if hours > 1 else "1h ago"
        days = hours // 24
        return f"{days}d ago" if days > 1 else "1d ago"

    def get_hot(self, obj: DebateTopic) -> bool:
        # Heuristic: recently created + enough votes.
        minutes = self._age_minutes(obj)
        total_votes = int(getattr(obj, "for_votes", 0)) + int(getattr(obj, "against_votes", 0))
        age_hours = minutes / 60.0
        return age_hours <= 12 and total_votes >= 5

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Preserve the frontend's existing keys (`for`/`against`) without using Python keywords
        # as serializer field names.
        data["for"] = data.pop("for_votes", 0)
        data["against"] = data.pop("against_votes", 0)
        return data


class DebateTopicPublicDetailSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name")
    categoryColor = serializers.SerializerMethodField()

    forVotes = serializers.IntegerField(source="for_votes")
    againstVotes = serializers.IntegerField(source="against_votes")

    createdBy = serializers.CharField(source="created_by.username")
    timeAgo = serializers.SerializerMethodField()

    class Meta:
        model = DebateTopic
        fields = (
            "id",
            "category",
            "categoryColor",
            "title",
            "description",
            "forVotes",
            "againstVotes",
            "createdBy",
            "timeAgo",
        )

    def get_categoryColor(self, obj: DebateTopic) -> str:
        return _CATEGORY_META.get(obj.category.name, {}).get("color", "#ffffff")

    def get_timeAgo(self, obj: DebateTopic) -> str:
        from django.utils import timezone

        delta = timezone.now() - obj.created_at
        minutes = int(delta.total_seconds() // 60)
        if minutes < 60:
            return f"{minutes}m ago" if minutes > 1 else "1m ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours}h ago" if hours > 1 else "1h ago"
        days = hours // 24
        return f"{days}d ago" if days > 1 else "1d ago"


class CreateDebateTopicSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=120)
    title = serializers.CharField(max_length=250)
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def validate_description(self, value: str) -> str:
        return value.strip()


class CreateOpinionSerializer(serializers.Serializer):
    stance = serializers.CharField()
    content = serializers.CharField(max_length=500)

    def validate_stance(self, value: str) -> str:
        val = (value or "").strip().upper()
        if val == "FOR":
            return Opinion.Stance.FOR
        if val == "AGAINST":
            return Opinion.Stance.AGAINST
        raise serializers.ValidationError("stance must be either FOR or AGAINST")

    def validate_content(self, value: str) -> str:
        content = (value or "").strip()
        if not content:
            raise serializers.ValidationError("content cannot be empty")
        return content


class CreateReplySerializer(serializers.Serializer):
    content = serializers.CharField(max_length=500)

    def validate_content(self, value: str) -> str:
        content = (value or "").strip()
        if not content:
            raise serializers.ValidationError("content cannot be empty")
        return content


class VoteSerializer(serializers.Serializer):
    direction = serializers.ChoiceField(choices=["up", "down", "clear"])

    def to_vote_value(self, direction: str) -> int:
        if direction == "clear":
            return 0
        return Vote.Value.UP if direction == "up" else Vote.Value.DOWN


class UpdateOwnOpinionSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=500)

    def validate_content(self, value: str) -> str:
        content = (value or "").strip()
        if not content:
            raise serializers.ValidationError("content cannot be empty")
        return content


class SuggestCategorySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_name(self, value: str) -> str:
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("name cannot be empty")
        return name

    def validate_description(self, value: str) -> str:
        return (value or "").strip()


