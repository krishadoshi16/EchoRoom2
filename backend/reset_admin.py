import os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "echoroom.settings")
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    admin = User.objects.filter(username__iexact="admin").first()
    if not admin:
        admin, created = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
    admin.set_password("admin123")
    admin.is_staff = True
    admin.is_superuser = True
    admin.role = 'admin' # Assuming custom role mapping
    admin.save()
    print("Admin password reset successfully to 'admin123'.")
except Exception as e:
    print(f"Failed to reset admin: {e}")
