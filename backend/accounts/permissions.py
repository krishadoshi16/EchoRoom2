from rest_framework.permissions import BasePermission


class IsNotSuspendedOrBanned(BasePermission):
    """
    Blocks suspended/banned users from write access and most protected endpoints.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_banned", False):
            return False
        if getattr(user, "is_suspended", False):
            return False
        return True


class IsAdminUserOrReadOnly(BasePermission):
    """
    Allows anyone to read, but only admins to write.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return bool(getattr(request.user, "is_staff", False) and request.user.is_authenticated)


class IsAdminUser(BasePermission):
    """
    Admin-only permission for moderation endpoints.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_staff", False))

