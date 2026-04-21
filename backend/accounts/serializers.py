from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers


User = get_user_model()


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Run Django password validators for quality.
        candidate = User(username=attrs["username"], email=attrs["email"])
        validate_password(attrs["password"], candidate)

        return attrs

    def create(self, validated_data):
        password = validated_data["password"]
        validated_data = {k: v for k, v in validated_data.items() if k != "confirm_password"}
        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
            role=User.Role.REGISTERED,
        )
        user.set_password(password)
        user.save()
        return user


class UpdateProfileSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)

    def validate_username(self, value: str) -> str:
        username = (value or "").strip()
        if not username:
            raise serializers.ValidationError("Username cannot be empty.")
        user = self.context["request"].user
        if User.objects.filter(~Q(id=user.id), username=username).exists():
            raise serializers.ValidationError("Username is already in use.")
        return username

    def validate_email(self, value: str) -> str:
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email cannot be empty.")
        user = self.context["request"].user
        if User.objects.filter(~Q(id=user.id), email=email).exists():
            raise serializers.ValidationError("Email is already in use.")
        return email


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(min_length=8, write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["new_password"], user)
        return attrs

