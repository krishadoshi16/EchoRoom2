import os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "echoroom.settings")
django.setup()

from debates.models import Category, DebateTopic
from django.contrib.auth import get_user_model

# 1. Force approve all items
cats_updated = Category.objects.update(status="approved")
topics_updated = DebateTopic.objects.update(status="approved")
print(f"Approved {cats_updated} categories and {topics_updated} topics.")

# 2. Force reset admin password again to be absolutely sure
User = get_user_model()
admin, _ = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
admin.set_password("admin123")
admin.is_staff = True
admin.is_superuser = True
if hasattr(admin, 'role'):
    admin.role = 'admin'
admin.save()
print("Admin password securely set to: admin123")
