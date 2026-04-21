from __future__ import annotations

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsNotSuspendedOrBanned
from .models import Category, DebateTopic, Opinion, OpinionReport, Vote
from .serializers import (
    CategoryPublicSerializer,
    CreateDebateTopicSerializer,
    CreateOpinionSerializer,
    CreateReplySerializer,
    DebateTopicPublicDetailSerializer,
    DebateTopicPublicListSerializer,
    SuggestCategorySerializer,
    UpdateOwnOpinionSerializer,
    VoteSerializer,
)


class ApprovedCategoryListView(generics.ListAPIView):
    """
    Visitor: browse categories.
    Only returns categories approved by admin, and includes counts of approved debate topics.
    """

    serializer_class = CategoryPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        approved_topic_status = DebateTopic.Status.APPROVED
        return (
            Category.objects.filter(status=Category.Status.APPROVED)
            .annotate(
                debates=Count(
                    "debate_topics",
                    filter=Q(debate_topics__status=approved_topic_status),
                )
            )
            .order_by("name")
        )


class ApprovedDebateTopicListView(generics.ListAPIView):
    """
    Visitor: browse approved debate topics (for Home + Category pages).
    Returns aggregated vote counts and an opinion count.
    """

    serializer_class = DebateTopicPublicListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = (
            DebateTopic.objects.select_related("category")
            .filter(status=DebateTopic.Status.APPROVED, category__status=Category.Status.APPROVED)
            .annotate(
                # Debate side totals: count UPVOTES on opinions of each stance.
                for_votes=Count(
                    "opinions__votes",
                    filter=Q(opinions__stance=Opinion.Stance.FOR, opinions__votes__value=1),
                ),
                against_votes=Count(
                    "opinions__votes",
                    filter=Q(opinions__stance=Opinion.Stance.AGAINST, opinions__votes__value=1),
                ),
                opinions_count=Count("opinions", distinct=True),
                votes_count=Count("opinions__votes", distinct=True),
                net_score=Coalesce(Sum("opinions__votes__value"), 0),
            )
        )

        category = self.request.query_params.get("category")
        if category:
            # Allow passing category name (matches frontend).
            qs = qs.filter(category__name=category)

        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        sort = (self.request.query_params.get("sort") or "hot").lower()
        if sort == "new":
            qs = qs.order_by("-created_at")
        elif sort == "top":
            # Sort by net vote score (up - down).
            qs = qs.order_by("-net_score", "-created_at")
        else:
            # "hot": recently created + vote volume.
            qs = qs.order_by("-votes_count", "-created_at")

        # Secondary stable ordering.
        return qs


class ApprovedDebateTopicDetailView(generics.RetrieveAPIView):
    """
    Visitor: get approved debate topic details.
    """

    serializer_class = DebateTopicPublicDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_url_kwarg = "topic_id"

    def get_queryset(self):
        approved_category_status = Category.Status.APPROVED
        approved_topic_status = DebateTopic.Status.APPROVED
        return (
            DebateTopic.objects.select_related("category", "created_by")
            .filter(status=approved_topic_status, category__status=approved_category_status)
            .annotate(
                for_votes=Count(
                    "opinions__votes",
                    filter=Q(opinions__stance=Opinion.Stance.FOR, opinions__votes__value=Vote.Value.UP),
                ),
                against_votes=Count(
                    "opinions__votes",
                    filter=Q(
                        opinions__stance=Opinion.Stance.AGAINST,
                        opinions__votes__value=Vote.Value.UP,
                    ),
                ),
            )
        )


def _format_time_ago(created_at):
    from django.utils import timezone

    delta = timezone.now() - created_at
    minutes = int(delta.total_seconds() // 60)
    if minutes < 60:
        return f"{minutes}m ago" if minutes > 1 else "1m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago" if hours > 1 else "1h ago"
    days = hours // 24
    return f"{days}d ago" if days > 1 else "1d ago"


def _avatar_for_username(username: str) -> str:
    if not username:
        return "U"
    return username[0].upper()


def _avatar_color_for_stance(stance: str) -> str:
    # Best-effort visual mapping aligned to existing frontend.
    return "#7EC8C8" if stance == Opinion.Stance.FOR else "#F4A7B9"


class ApprovedDebateTopicOpinionsView(APIView):
    """
    Visitor: list top-level opinions + single-level replies.

    Returns a nested structure matching your frontend's current shape.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, topic_id: int):
        topic = get_object_or_404(
            DebateTopic.objects.select_related("category"),
            id=topic_id,
            status=DebateTopic.Status.APPROVED,
            category__status=Category.Status.APPROVED,
        )

        top_opinion_qs = (
            Opinion.objects.filter(debate=topic, parent_opinion__isnull=True)
            .select_related("author")
            .annotate(
                upvotes=Count("votes", filter=Q(votes__value=Vote.Value.UP)),
                downvotes=Count("votes", filter=Q(votes__value=Vote.Value.DOWN)),
            )
            .order_by("-created_at")
        )

        top_opinions = list(top_opinion_qs)
        top_ids = [op.id for op in top_opinions]

        user_vote_map: dict[int, str] = {}
        if request.user and request.user.is_authenticated:
            user_votes = Vote.objects.filter(user=request.user, opinion_id__in=top_ids)
            for v in user_votes:
                user_vote_map[v.opinion_id] = "up" if v.value == Vote.Value.UP else "down"

        replies_map: dict[int, list[dict]] = {op.id: [] for op in top_opinions}
        if top_ids:
            reply_qs = (
                Opinion.objects.filter(debate=topic, parent_opinion_id__in=top_ids)
                .select_related("author", "parent_opinion")
                .annotate(
                    # Replies don't show vote buttons in the current UI,
                    # but we keep counts consistent if you decide to add it.
                    upvotes=Count("votes", filter=Q(votes__value=Vote.Value.UP)),
                    downvotes=Count("votes", filter=Q(votes__value=Vote.Value.DOWN)),
                )
                .order_by("created_at")
            )

            for reply in reply_qs:
                parent_id = reply.parent_opinion_id
                if parent_id not in replies_map:
                    continue
                replies_map[parent_id].append(
                    {
                        "id": reply.id,
                        "stance": "FOR" if reply.stance == Opinion.Stance.FOR else "AGAINST",
                        "author": reply.author.username,
                        "avatar": _avatar_for_username(reply.author.username),
                        "avatarColor": _avatar_color_for_stance(reply.stance),
                        "text": reply.content,
                        "timeAgo": _format_time_ago(reply.created_at),
                        "isMine": bool(request.user.is_authenticated and request.user.id == reply.author_id),
                    }
                )

        # Build nested response.
        response_list: list[dict] = []
        for op in top_opinions:
            response_list.append(
                {
                    "id": op.id,
                    "stance": "FOR" if op.stance == Opinion.Stance.FOR else "AGAINST",
                    "author": op.author.username,
                    "avatar": _avatar_for_username(op.author.username),
                    "avatarColor": _avatar_color_for_stance(op.stance),
                    "text": op.content,
                    "upvotes": int(getattr(op, "upvotes", 0) or 0),
                    "downvotes": int(getattr(op, "downvotes", 0) or 0),
                    "userVote": user_vote_map.get(op.id),
                    "timeAgo": _format_time_ago(op.created_at),
                    "isMine": bool(request.user.is_authenticated and request.user.id == op.author_id),
                    "replies": replies_map.get(op.id, []),
                }
            )

        return Response(response_list, status=status.HTTP_200_OK)


class CreateDebateTopicView(APIView):
    """
    Registered user can create a topic under an approved category.
    New topics are submitted for admin review (pending).
    """

    permission_classes = [IsNotSuspendedOrBanned]

    def post(self, request):
        serializer = CreateDebateTopicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category_name = serializer.validated_data["category"]
        category = Category.objects.filter(name=category_name, status=Category.Status.APPROVED).first()
        if not category:
            return Response(
                {"detail": "Category not found or not approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        topic = DebateTopic.objects.create(
            category=category,
            title=serializer.validated_data["title"],
            description=serializer.validated_data["description"],
            created_by=request.user,
            status=DebateTopic.Status.PENDING,
        )
        return Response({"id": topic.id, "status": topic.status}, status=status.HTTP_201_CREATED)


class CreateOpinionView(APIView):
    """
    Registered user can post a top-level opinion (FOR / AGAINST) under an approved topic.
    """

    permission_classes = [IsNotSuspendedOrBanned]

    def post(self, request, topic_id: int):
        serializer = CreateOpinionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        topic = get_object_or_404(
            DebateTopic.objects.select_related("category"),
            id=topic_id,
            status=DebateTopic.Status.APPROVED,
            category__status=Category.Status.APPROVED,
        )

        opinion = Opinion.objects.create(
            debate=topic,
            author=request.user,
            stance=serializer.validated_data["stance"],
            content=serializer.validated_data["content"],
            parent_opinion=None,
        )
        return Response({"id": opinion.id}, status=status.HTTP_201_CREATED)


class CreateReplyView(APIView):
    """
    Registered user can post a single-level reply to an existing top-level opinion.
    Reply inherits the parent's stance.
    """

    permission_classes = [IsNotSuspendedOrBanned]

    def post(self, request, opinion_id: int):
        serializer = CreateReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent = get_object_or_404(
            Opinion.objects.select_related("debate__category"),
            id=opinion_id,
        )

        # Single-level replies only.
        if parent.parent_opinion_id is not None:
            return Response(
                {"detail": "Only single-level replies are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parent opinion must belong to an approved topic/category.
        if parent.debate.status != DebateTopic.Status.APPROVED or parent.debate.category.status != Category.Status.APPROVED:
            return Response(
                {"detail": "Topic is not approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reply = Opinion.objects.create(
            debate=parent.debate,
            author=request.user,
            stance=parent.stance,
            content=serializer.validated_data["content"],
            parent_opinion=parent,
        )
        return Response({"id": reply.id}, status=status.HTTP_201_CREATED)


class VoteOpinionView(APIView):
    """
    Registered user can upvote or downvote an opinion.
    Restricts to one vote per user per opinion, and allows changing vote.
    """

    permission_classes = [IsNotSuspendedOrBanned]

    def post(self, request, opinion_id: int):
        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        direction = serializer.validated_data["direction"]
        value = serializer.to_vote_value(direction)

        opinion = get_object_or_404(
            Opinion.objects.select_related("debate__category"),
            id=opinion_id,
        )

        if opinion.debate.status != DebateTopic.Status.APPROVED or opinion.debate.category.status != Category.Status.APPROVED:
            return Response(
                {"detail": "Topic is not approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if direction == "clear":
            Vote.objects.filter(user=request.user, opinion=opinion).delete()
        else:
            vote, created = Vote.objects.get_or_create(
                user=request.user,
                opinion=opinion,
                defaults={"value": value},
            )
            if not created and vote.value != value:
                vote.value = value
                vote.save(update_fields=["value"])

        return Response({"opinion": opinion_id, "direction": direction}, status=status.HTTP_200_OK)


class UpdateDeleteOwnOpinionView(APIView):
    permission_classes = [IsNotSuspendedOrBanned]

    def patch(self, request, opinion_id: int):
        serializer = UpdateOwnOpinionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        opinion = get_object_or_404(Opinion, id=opinion_id)
        if opinion.author_id != request.user.id:
            return Response({"detail": "You can edit only your own opinion."}, status=status.HTTP_403_FORBIDDEN)

        opinion.content = serializer.validated_data["content"]
        opinion.save(update_fields=["content", "updated_at"])
        return Response({"id": opinion.id}, status=status.HTTP_200_OK)

    def delete(self, request, opinion_id: int):
        opinion = get_object_or_404(Opinion, id=opinion_id)
        if opinion.author_id != request.user.id:
            return Response({"detail": "You can delete only your own opinion."}, status=status.HTTP_403_FORBIDDEN)

        opinion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportOpinionView(APIView):
    permission_classes = [IsNotSuspendedOrBanned]

    def post(self, request, opinion_id: int):
        opinion = get_object_or_404(Opinion, id=opinion_id)
        reason = (request.data.get("reason") or "").strip()
        report, created = OpinionReport.objects.get_or_create(
            opinion=opinion,
            reporter=request.user,
            defaults={"reason": reason},
        )
        if not created and reason:
            report.reason = reason
            report.save(update_fields=["reason"])
        return Response({"id": report.id, "created": created}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SuggestCategoryView(APIView):
    permission_classes = [IsNotSuspendedOrBanned]

    def post(self, request):
        serializer = SuggestCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]
        description = serializer.validated_data["description"]
        if Category.objects.filter(name=name).exists():
            return Response({"detail": "Category already exists."}, status=status.HTTP_400_BAD_REQUEST)
        category = Category.objects.create(
            name=name,
            description=description,
            status=Category.Status.PENDING,
            suggested_by=request.user,
        )
        return Response({"id": category.id, "status": category.status}, status=status.HTTP_201_CREATED)

