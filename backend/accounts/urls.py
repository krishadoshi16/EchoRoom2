from django.urls import path

from .views import ChangePasswordView, MeActivityView, MeView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("me/activity/", MeActivityView.as_view(), name="me-activity"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]

