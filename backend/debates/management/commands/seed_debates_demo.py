from __future__ import annotations

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from debates.models import Category, DebateTopic, Opinion, Vote


User = get_user_model()


def ensure_user(username: str, email: str, password: str = "StrongPass123!") -> User:
    obj = User.objects.filter(username=username).first()
    if obj:
        return obj
    obj = User(username=username, email=email, role=User.Role.REGISTERED)
    obj.set_password(password)
    obj.save()
    return obj


class Command(BaseCommand):
    help = "Seed demo approved debates with opinions + votes."

    def handle(self, *args, **options):
        seed_admin = ensure_user("seed_admin", "seed_admin@example.com")

        default_topics: list[dict] = [
            {
                "category": "Technology",
                "title": "AI will replace software developers within 10 years",
                "description": "AI coding tools can automate significant parts of software development; some believe replacement is inevitable.",
                "opinions": [
                    {
                        "stance": Opinion.Stance.FOR,
                        "content": "In many companies, AI already writes 40-60% of code. Over a decade, remaining work will increasingly be automated.",
                        "upvotes": 12,
                        "downvotes": 3,
                    },
                    {
                        "stance": Opinion.Stance.AGAINST,
                        "content": "AI is a powerful tool, but it lacks business context and the ability to manage complex stakeholder trade-offs.",
                        "upvotes": 7,
                        "downvotes": 2,
                    },
                ],
            },
            {
                "category": "Politics",
                "title": "Universal Basic Income is necessary for modern economies",
                "description": "Automation and labor market shifts suggest a need for a baseline income to maintain stability.",
                "opinions": [
                    {
                        "stance": Opinion.Stance.FOR,
                        "content": "UBI reduces poverty and gives people security to adapt as jobs evolve.",
                        "upvotes": 9,
                        "downvotes": 1,
                    },
                    {
                        "stance": Opinion.Stance.AGAINST,
                        "content": "UBI may be expensive and could weaken incentives to work without complementary policies.",
                        "upvotes": 5,
                        "downvotes": 4,
                    },
                ],
            },
        ]

        created_topics = 0
        created_opinions = 0
        created_votes = 0

        for topic_item in default_topics:
            category = Category.objects.filter(name=topic_item["category"], status=Category.Status.APPROVED).first()
            if not category:
                self.stdout.write(self.style.WARNING(f"Skipping topic (missing category): {topic_item['category']}"))
                continue

            topic, was_created = DebateTopic.objects.get_or_create(
                category=category,
                title=topic_item["title"],
                defaults={
                    "description": topic_item.get("description", ""),
                    "created_by": seed_admin,
                    "status": DebateTopic.Status.APPROVED,
                },
            )
            if not was_created:
                # Keep it approved (visitor pages need it).
                if topic.status != DebateTopic.Status.APPROVED or topic.description != topic_item.get("description", ""):
                    topic.description = topic_item.get("description", "")
                    topic.status = DebateTopic.Status.APPROVED
                    topic.save(update_fields=["description", "status"])
            else:
                created_topics += 1

            for i, op_item in enumerate(topic_item["opinions"], start=1):
                opinion, op_created = Opinion.objects.get_or_create(
                    debate=topic,
                    stance=op_item["stance"],
                    content=op_item["content"],
                    defaults={"author": seed_admin},
                )
                if op_created:
                    created_opinions += 1

                # Upvotes
                for v in range(op_item["upvotes"]):
                    username = f"seed_u_{topic.id}_{i}_up_{v}"
                    email = f"{username}@example.com"
                    user = ensure_user(username, email)
                    _, vote_created = Vote.objects.get_or_create(
                        opinion=opinion,
                        user=user,
                        defaults={"value": Vote.Value.UP},
                    )
                    if vote_created:
                        created_votes += 1

                # Downvotes
                for v in range(op_item["downvotes"]):
                    username = f"seed_u_{topic.id}_{i}_down_{v}"
                    email = f"{username}@example.com"
                    user = ensure_user(username, email)
                    _, vote_created = Vote.objects.get_or_create(
                        opinion=opinion,
                        user=user,
                        defaults={"value": Vote.Value.DOWN},
                    )
                    if vote_created:
                        created_votes += 1
                    created_votes += Vote.objects.filter(opinion=opinion, user=user, value=Vote.Value.DOWN).count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded debates. topics_created={created_topics}, opinions_created={created_opinions}, votes_created~={created_votes}"
            )
        )

