from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from debates.models import DebateTopic, Opinion
from .serializers import (
    ChangePasswordSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserPublicSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Issue JWT tokens right after successful registration.
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserPublicSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    def get(self, request):
        return Response(UserPublicSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        updated_fields = []
        if "username" in serializer.validated_data:
            user.username = serializer.validated_data["username"]
            updated_fields.append("username")
        if "email" in serializer.validated_data:
            user.email = serializer.validated_data["email"]
            updated_fields.append("email")
        if updated_fields:
            user.save(update_fields=updated_fields)
        return Response(UserPublicSerializer(user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class MeActivityView(APIView):
    def get(self, request):
        user = request.user
        topics = (
            DebateTopic.objects.filter(created_by=user)
            .select_related("category")
            .order_by("-created_at")[:5]
        )
        opinions = (
            Opinion.objects.filter(author=user)
            .select_related("debate")
            .order_by("-created_at")[:5]
        )
        return Response(
            {
                "stats": {
                    "topics": DebateTopic.objects.filter(created_by=user).count(),
                    "opinions": Opinion.objects.filter(author=user).count(),
                },
                "recentTopics": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "category": t.category.name,
                        "status": t.status,
                    }
                    for t in topics
                ],
                "recentOpinions": [
                    {
                        "id": o.id,
                        "debate": o.debate.title,
                        "stance": "FOR" if o.stance == Opinion.Stance.FOR else "AGAINST",
                        "content": o.content[:120],
                    }
                    for o in opinions
                ],
            },
            status=status.HTTP_200_OK,
        )

