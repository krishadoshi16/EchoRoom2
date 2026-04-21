from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUser
from debates.models import Category, DebateTopic, Opinion, OpinionReport

from .serializers import (
    AdminCategorySerializer,
    AdminCreateCategorySerializer,
    AdminPendingTopicSerializer,
    AdminRecentOpinionSerializer,
    AdminSetUserStatusSerializer,
    AdminStatsSerializer,
    AdminUpdateCategorySerializer,
    AdminUserSerializer,
)


User = get_user_model()


class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = {
            "pending_topics": DebateTopic.objects.filter(status=DebateTopic.Status.PENDING).count(),
            "pending_categories": Category.objects.filter(status=Category.Status.PENDING).count(),
            "approved_topics": DebateTopic.objects.filter(status=DebateTopic.Status.APPROVED).count(),
            "approved_categories": Category.objects.filter(status=Category.Status.APPROVED).count(),
            "total_users": User.objects.count(),
            "active_users": User.objects.filter(is_banned=False).count(),
        }
        serializer = AdminStatsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminPendingTopicsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            DebateTopic.objects.select_related("category", "created_by")
            .filter(status=DebateTopic.Status.PENDING)
            .order_by("created_at")
        )
        return Response(AdminPendingTopicSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class AdminTopicApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, topic_id: int):
        topic = get_object_or_404(DebateTopic, id=topic_id)
        if topic.status != DebateTopic.Status.PENDING:
            return Response({"detail": "Topic is not pending."}, status=status.HTTP_400_BAD_REQUEST)

        topic.status = DebateTopic.Status.APPROVED
        topic.moderated_by = request.user
        topic.moderated_at = timezone.now()
        topic.save(update_fields=["status", "moderated_by", "moderated_at"])
        return Response({"id": topic.id, "status": topic.status}, status=status.HTTP_200_OK)


class AdminTopicRejectView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, topic_id: int):
        topic = get_object_or_404(DebateTopic, id=topic_id)
        if topic.status != DebateTopic.Status.PENDING:
            return Response({"detail": "Topic is not pending."}, status=status.HTTP_400_BAD_REQUEST)

        topic.status = DebateTopic.Status.REJECTED
        topic.moderated_by = request.user
        topic.moderated_at = timezone.now()
        topic.save(update_fields=["status", "moderated_by", "moderated_at"])
        return Response({"id": topic.id, "status": topic.status}, status=status.HTTP_200_OK)


class AdminRecentOpinionsView(APIView):
    """
    Until reporting is implemented, this provides a recent-opinions feed for moderation.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get("limit") or 50)
        limit = max(1, min(limit, 200))

        rows = []
        qs = (
            OpinionReport.objects.select_related("opinion__author", "opinion__debate")
            .filter(resolved=False)
            .annotate(report_count=Count("opinion__reports"))
            .order_by("-created_at")[:limit]
        )
        for r in qs:
            rows.append(
                {
                    "id": r.opinion_id,
                    "author": r.opinion.author.username,
                    "debate": r.opinion.debate.title,
                    "content": r.opinion.content,
                    "createdAt": r.created_at,
                    "reportCount": int(getattr(r, "report_count", 1) or 1),
                    "reason": r.reason or "Reported by user",
                }
            )
        return Response(AdminRecentOpinionSerializer(rows, many=True).data, status=status.HTTP_200_OK)


class AdminDeleteOpinionView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, opinion_id: int):
        opinion = get_object_or_404(Opinion, id=opinion_id)
        OpinionReport.objects.filter(opinion_id=opinion_id).update(resolved=True)
        opinion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            User.objects.annotate(debates=Count("created_debate_topics", distinct=True))
            .order_by("username")
        )

        rows = []
        for u in qs:
            if getattr(u, "is_banned", False):
                status_label = "Banned"
            elif getattr(u, "is_suspended", False):
                status_label = "Suspended"
            else:
                status_label = "Active"

            role_label = "Admin" if getattr(u, "is_staff", False) else "User"
            rows.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "roleLabel": role_label,
                    "debates": int(getattr(u, "debates", 0) or 0),
                    "status": status_label,
                }
            )

        return Response(AdminUserSerializer(rows, many=True).data, status=status.HTTP_200_OK)


class AdminSetUserBannedView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id: int):
        serializer = AdminSetUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = get_object_or_404(User, id=user_id)
        # Prevent banning yourself by mistake.
        if target.id == request.user.id:
            return Response({"detail": "You cannot ban yourself."}, status=status.HTTP_400_BAD_REQUEST)

        target.is_banned = bool(serializer.validated_data["value"])
        target.save(update_fields=["is_banned", "banned_at", "is_active"])
        return Response({"id": target.id, "is_banned": target.is_banned}, status=status.HTTP_200_OK)


class AdminSetUserSuspendedView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id: int):
        serializer = AdminSetUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = get_object_or_404(User, id=user_id)
        if target.id == request.user.id:
            return Response({"detail": "You cannot suspend yourself."}, status=status.HTTP_400_BAD_REQUEST)

        target.is_suspended = bool(serializer.validated_data["value"])
        target.save(update_fields=["is_suspended", "suspended_at"])
        return Response({"id": target.id, "is_suspended": target.is_suspended}, status=status.HTTP_200_OK)


class AdminCategoriesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "").strip().lower()
        qs = Category.objects.select_related("suggested_by").order_by("name")
        if status_filter in {Category.Status.PENDING, Category.Status.APPROVED, Category.Status.REJECTED}:
            qs = qs.filter(status=status_filter)
        return Response(AdminCategorySerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminCreateCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]

        if Category.objects.filter(name=name).exists():
            return Response({"detail": "Category with this name already exists."}, status=status.HTTP_400_BAD_REQUEST)

        cat = Category.objects.create(
            name=name,
            description=serializer.validated_data["description"],
            status=Category.Status.APPROVED,
            moderated_by=request.user,
            moderated_at=timezone.now(),
        )
        return Response(AdminCategorySerializer(cat).data, status=status.HTTP_201_CREATED)


class AdminCategoryUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, category_id: int):
        cat = get_object_or_404(Category, id=category_id)
        serializer = AdminUpdateCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_fields = []
        if "name" in serializer.validated_data:
            name = serializer.validated_data["name"]
            if Category.objects.filter(~Q(id=cat.id), name=name).exists():
                return Response({"detail": "Category with this name already exists."}, status=status.HTTP_400_BAD_REQUEST)
            cat.name = name
            updated_fields.append("name")
        if "description" in serializer.validated_data:
            cat.description = serializer.validated_data["description"]
            updated_fields.append("description")

        cat.moderated_by = request.user
        cat.moderated_at = timezone.now()
        updated_fields.extend(["moderated_by", "moderated_at"])
        cat.save(update_fields=updated_fields)
        return Response(AdminCategorySerializer(cat).data, status=status.HTTP_200_OK)

    def delete(self, request, category_id: int):
        cat = get_object_or_404(Category, id=category_id)
        if cat.debate_topics.exists():
            return Response(
                {"detail": "Cannot delete a category that has debate topics."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCategoryApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, category_id: int):
        cat = get_object_or_404(Category, id=category_id)
        if cat.status != Category.Status.PENDING:
            return Response({"detail": "Category is not pending."}, status=status.HTTP_400_BAD_REQUEST)
        cat.status = Category.Status.APPROVED
        cat.moderated_by = request.user
        cat.moderated_at = timezone.now()
        cat.save(update_fields=["status", "moderated_by", "moderated_at"])
        return Response({"id": cat.id, "status": cat.status}, status=status.HTTP_200_OK)


class AdminCategoryRejectView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, category_id: int):
        cat = get_object_or_404(Category, id=category_id)
        if cat.status != Category.Status.PENDING:
            return Response({"detail": "Category is not pending."}, status=status.HTTP_400_BAD_REQUEST)
        cat.status = Category.Status.REJECTED
        cat.moderated_by = request.user
        cat.moderated_at = timezone.now()
        cat.save(update_fields=["status", "moderated_by", "moderated_at"])
        return Response({"id": cat.id, "status": cat.status}, status=status.HTTP_200_OK)

