from map_app.models import User
from django.db.models.signals import post_migrate
from django.dispatch import receiver
import os


@receiver(post_migrate)
def create_default_admin(sender, **kwargs):
    """Create a default admin user if not already present."""
    ADMIN_USERNAME = os.getenv(
        "ADMIN_USERNAME",
    )
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

    if not User.objects.filter(username=ADMIN_USERNAME, email=ADMIN_EMAIL).exists():
        User.objects.create_superuser(
            username=ADMIN_USERNAME,
            password=ADMIN_PASSWORD,
            email=ADMIN_EMAIL,
            credits=1000000,
        )
        print(f"Default admin user '{ADMIN_USERNAME}' created.")
    else:
        print(f"Admin user '{ADMIN_USERNAME}' already exists.")
