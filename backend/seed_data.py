import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "echoroom.settings")
django.setup()

from debates.models import Category
from accounts.models import User

def seed():
    # Create or get admin user
    admin, created = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@echoroom.com",
            "role": User.Role.ADMIN,
            "is_superuser": True
        }
    )
    if created:
        admin.set_password("admin123")
        admin.save()
        print("Created admin user (admin / admin123)")

    # Categories to seed
    categories = [
        {"name": "Technology", "description": "AI, software, gadgets, and the digital future"},
        {"name": "Politics", "description": "Governance, policy, elections, and global affairs"},
        {"name": "Science", "description": "Research, discoveries, space, and medicine"},
        {"name": "Education", "description": "Schools, learning methods, and academic systems"},
        {"name": "Environment", "description": "Climate, sustainability, energy, and ecology"},
        {"name": "Society", "description": "Culture, ethics, social issues, and human rights"},
        {"name": "Economy", "description": "Finance, trade, markets, and economic systems"},
        {"name": "Health", "description": "Medicine, mental health, diet, and wellness"}
    ]

    for cat_data in categories:
        cat, created = Category.objects.get_or_create(
            name=cat_data["name"],
            defaults={
                "description": cat_data["description"],
                "status": Category.Status.APPROVED
            }
        )
        if created:
            print(f"Created category: {cat.name}")

if __name__ == "__main__":
    print("Seeding data...")
    seed()
    print("Done seeding data.")
