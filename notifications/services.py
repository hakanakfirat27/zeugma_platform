from .models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationService:
    """Service class to create different types of notifications"""

    @staticmethod
    def create_report_notification(user, report_id, report_title):
        """Create notification when a new report is assigned"""
        return Notification.objects.create(
            user=user,
            notification_type='report',
            title='New Report Available',
            message=f'A new report "{report_title}" has been assigned to you and is ready to view.',
            related_report_id=report_id
        )

    @staticmethod
    def create_subscription_expiry_notification(user, subscription_id, days_remaining):
        """Create notification when subscription is nearing expiry"""
        return Notification.objects.create(
            user=user,
            notification_type='subscription',
            title='Subscription Renewal Reminder',
            message=f'Your premium subscription will expire in {days_remaining} days. Please renew to continue enjoying our services.',
            related_subscription_id=subscription_id
        )

    @staticmethod
    def create_message_notification(user, message_id, sender_name):
        """Create notification when user receives a message from admin"""
        return Notification.objects.create(
            user=user,
            notification_type='message',
            title='New Message from Admin',
            message=f'You have received a new message from {sender_name}.',
            related_message_id=message_id
        )

    @staticmethod
    def create_announcement_notification(user, announcement_id, announcement_title):
        """Create notification for site announcements"""
        return Notification.objects.create(
            user=user,
            notification_type='announcement',
            title='New Announcement',
            message=f'{announcement_title}',
            related_announcement_id=announcement_id
        )

    @staticmethod
    def create_payment_notification(user, amount, status_text='successful'):
        """Create notification for payment updates"""
        return Notification.objects.create(
            user=user,
            notification_type='payment',
            title=f'Payment {status_text.capitalize()}',
            message=f'Your payment of ${amount} has been {status_text}.'
        )

    @staticmethod
    def create_system_notification(user, title, message):
        """Create general system notification"""
        return Notification.objects.create(
            user=user,
            notification_type='system',
            title=title,
            message=message
        )

    @staticmethod
    def broadcast_announcement_to_all_users(announcement_id, announcement_title, announcement_message):
        """Send announcement notification to all users"""
        users = User.objects.filter(is_active=True)
        notifications = [
            Notification(
                user=user,
                notification_type='announcement',
                title=announcement_title,
                message=announcement_message,
                related_announcement_id=announcement_id
            )
            for user in users
        ]
        Notification.objects.bulk_create(notifications)

    @staticmethod
    def send_email_notification(user, subject, message):
        """Send email notification to user"""
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )