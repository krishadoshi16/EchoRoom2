from __future__ import annotations

from django.core.management.base import BaseCommand

from debates.models import Category


DEFAULT_CATEGORIES: list[dict[str, str]] = [
    {"name": "Technology", "description": "AI, software, gadgets, and the digital future"},
    {"name": "Politics", "description": "Governance, policy, elections, and global affairs"},
    {"name": "Science", "description": "Research, discoveries, space, and medicine"},
    {"name": "Education", "description": "Schools, learning methods, and academic systems"},
    {"name": "Environment", "description": "Climate, sustainability, energy, and ecology"},
    {"name": "Society", "description": "Culture, ethics, social issues, and human rights"},
    {"name": "Economy", "description": "Finance, trade, markets, and economic systems"},
    {"name": "Health", "description": "Medicine, mental health, diet, and wellness"},
]


class Command(BaseCommand):
    help = "Seed default EchoRoom categories (approved) into the database."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for item in DEFAULT_CATEGORIES:
            obj, was_created = Category.objects.get_or_create(
                name=item["name"],
                defaults={
                    "description": item.get("description", ""),
                    "status": Category.Status.APPROVED,
                },
            )
            if was_created:
                created += 1
            else:
                # Keep description in sync if it differs.
                new_description = item.get("description", "")
                if obj.description != new_description or obj.status != Category.Status.APPROVED:
                    obj.description = new_description
                    obj.status = Category.Status.APPROVED
                    obj.save(update_fields=["description", "status"])
                    updated += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded categories. created={created} updated={updated}"))

