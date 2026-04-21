from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "is_staff", "is_active", "is_suspended", "is_banned")
    list_filter = ("role", "is_suspended", "is_banned", "is_staff", "is_active")
    search_fields = ("username", "email")

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Moderation",
            {
                "fields": (
                    "role",
                    "is_suspended",
                    "suspended_at",
                    "is_banned",
                    "banned_at",
                )
            },
        ),
    )

