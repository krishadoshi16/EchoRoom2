from django.contrib import admin

from .models import Category, DebateTopic, Opinion, Vote


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "created_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("name",)


@admin.register(DebateTopic)
class DebateTopicAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "category", "created_by", "created_at")
    list_filter = ("status", "category")
    search_fields = ("title",)


@admin.register(Opinion)
class OpinionAdmin(admin.ModelAdmin):
    list_display = ("id", "debate", "author", "stance", "parent_opinion", "created_at")
    list_filter = ("stance", "debate")
    search_fields = ("content",)


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ("id", "opinion", "user", "value", "created_at")
    list_filter = ("value",)

