from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from notifications.services import NotificationService

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test notifications for a user'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to create notifications for')

    def handle(self, *args, **options):
        username = options['username']

        try:
            user = User.objects.get(username=username)

            # Create various test notifications
            NotificationService.create_report_notification(
                user=user,
                report_id=1,
                report_title="Monthly Analytics Report - October 2024"
            )

            NotificationService.create_subscription_expiry_notification(
                user=user,
                subscription_id=1,
                days_remaining=3
            )

            NotificationService.create_message_notification(
                user=user,
                message_id=1,
                sender_name="Admin Support Team"
            )

            NotificationService.create_announcement_notification(
                user=user,
                announcement_id=1,
                announcement_title="System maintenance scheduled for this weekend"
            )

            NotificationService.create_payment_notification(
                user=user,
                amount=99.99,
                status_text="successful"
            )

            self.stdout.write(
                self.style.SUCCESS(f'Successfully created test notifications for user: {username}')
            )

        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with username "{username}" does not exist')
            )