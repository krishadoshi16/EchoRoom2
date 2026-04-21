from django.urls import path

from .views import (
    ApprovedCategoryListView,
    ApprovedDebateTopicDetailView,
    ApprovedDebateTopicListView,
    ApprovedDebateTopicOpinionsView,
    CreateDebateTopicView,
    CreateOpinionView,
    CreateReplyView,
    ReportOpinionView,
    SuggestCategoryView,
    UpdateDeleteOwnOpinionView,
    VoteOpinionView,
)

urlpatterns = [
    path("categories/", ApprovedCategoryListView.as_view(), name="categories-list"),
    path("topics/", ApprovedDebateTopicListView.as_view(), name="topics-list"),
    path("topics/<int:topic_id>/", ApprovedDebateTopicDetailView.as_view(), name="topic-detail"),
    path("topics/<int:topic_id>/opinions/", ApprovedDebateTopicOpinionsView.as_view(), name="topic-opinions"),
    # Registered-user write endpoints
    path("topics/create/", CreateDebateTopicView.as_view(), name="topic-create"),
    path("categories/suggest/", SuggestCategoryView.as_view(), name="category-suggest"),
    path("topics/<int:topic_id>/opinions/create/", CreateOpinionView.as_view(), name="opinion-create"),
    path("opinions/<int:opinion_id>/replies/create/", CreateReplyView.as_view(), name="reply-create"),
    path("opinions/<int:opinion_id>/", UpdateDeleteOwnOpinionView.as_view(), name="opinion-update-delete"),
    path("opinions/<int:opinion_id>/vote/", VoteOpinionView.as_view(), name="vote-opinion"),
    path("opinions/<int:opinion_id>/report/", ReportOpinionView.as_view(), name="report-opinion"),
]

