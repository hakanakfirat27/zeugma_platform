from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Reset all users to offline status'

    def handle(self, *args, **options):
        count = User.objects.update(is_online=False)
        self.stdout.write(
            self.style.SUCCESS(f'Successfully reset {count} users to offline')
        )