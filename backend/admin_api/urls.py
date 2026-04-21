from django.urls import path

from .views import (
    AdminCategoriesView,
    AdminCategoryApproveView,
    AdminCategoryRejectView,
    AdminCategoryUpdateView,
    AdminDeleteOpinionView,
    AdminPendingTopicsView,
    AdminRecentOpinionsView,
    AdminSetUserBannedView,
    AdminSetUserSuspendedView,
    AdminStatsView,
    AdminTopicApproveView,
    AdminTopicRejectView,
    AdminUsersView,
)

urlpatterns = [
    path("stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("pending-topics/", AdminPendingTopicsView.as_view(), name="admin-pending-topics"),
    path("topics/<int:topic_id>/approve/", AdminTopicApproveView.as_view(), name="admin-topic-approve"),
    path("topics/<int:topic_id>/reject/", AdminTopicRejectView.as_view(), name="admin-topic-reject"),
    path("opinions/recent/", AdminRecentOpinionsView.as_view(), name="admin-recent-opinions"),
    path("opinions/<int:opinion_id>/", AdminDeleteOpinionView.as_view(), name="admin-delete-opinion"),
    path("users/", AdminUsersView.as_view(), name="admin-users"),
    path("users/<int:user_id>/ban/", AdminSetUserBannedView.as_view(), name="admin-user-ban"),
    path("users/<int:user_id>/suspend/", AdminSetUserSuspendedView.as_view(), name="admin-user-suspend"),
    path("categories/", AdminCategoriesView.as_view(), name="admin-categories"),
    path("categories/<int:category_id>/", AdminCategoryUpdateView.as_view(), name="admin-category-update"),
    path("categories/<int:category_id>/approve/", AdminCategoryApproveView.as_view(), name="admin-category-approve"),
    path("categories/<int:category_id>/reject/", AdminCategoryRejectView.as_view(), name="admin-category-reject"),
]

