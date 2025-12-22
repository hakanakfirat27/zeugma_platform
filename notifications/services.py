# notifications/services.py

from django.conf import settings
from django.core.mail import send_mail
from .models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()


def check_notification_allowed(notification_type=None):
    """
    Check if notifications are allowed based on global settings.
    Returns tuple: (is_allowed, settings_dict)
    """
    try:
        from dashboard.models import NotificationSettings, NotificationTypeConfig
        
        # Get global settings
        global_settings = NotificationSettings.get_settings()
        
        # Check master switch
        if not global_settings.get('notifications_enabled', True):
            return False, global_settings
        
        # If a specific type is provided, check type-level settings
        if notification_type:
            try:
                type_config = NotificationTypeConfig.objects.get(notification_type=notification_type)
                if not type_config.is_active:
                    return False, global_settings
            except NotificationTypeConfig.DoesNotExist:
                pass
        
        return True, global_settings
    except Exception as e:
        # If settings don't exist yet (e.g., before migrations), allow notifications
        print(f"⚠️ Could not check notification settings: {e}")
        return True, {}


def check_channel_enabled(notification_type, channel='inapp'):
    """
    Check if a specific channel is enabled for a notification type.
    channel: 'email', 'inapp', or 'push'
    """
    try:
        from dashboard.models import NotificationSettings, NotificationTypeConfig
        
        # Get global settings
        global_settings = NotificationSettings.get_settings()
        
        # Check master switch
        if not global_settings.get('notifications_enabled', True):
            return False
        
        # Check channel-level global setting
        if channel == 'email' and not global_settings.get('email_notifications_enabled', True):
            return False
        if channel == 'inapp' and not global_settings.get('inapp_notifications_enabled', True):
            return False
        if channel == 'push' and not global_settings.get('push_notifications_enabled', False):
            return False
        
        # Check type-specific channel setting
        try:
            type_config = NotificationTypeConfig.objects.get(notification_type=notification_type)
            if not type_config.is_active:
                return False
            
            if channel == 'email':
                return type_config.email_enabled
            elif channel == 'inapp':
                return type_config.inapp_enabled
            elif channel == 'push':
                return type_config.push_enabled
        except NotificationTypeConfig.DoesNotExist:
            pass
        
        return True
    except Exception as e:
        print(f"⚠️ Could not check channel settings: {e}")
        return True


class NotificationService:
    """Service class to create different types of notifications"""

    @staticmethod
    def create_notification(user, notification_type, title, message, **kwargs):
        """
        Generic method to create a notification with settings check.
        Returns the notification object if created, None if blocked by settings.
        Also sends push notification if enabled.
        """
        # Check if notifications are allowed
        is_allowed, global_settings = check_notification_allowed(notification_type)
        
        if not is_allowed:
            print(f"🚫 Notification blocked by settings: {notification_type} for {user.username}")
            return None
        
        # Check if in-app notifications are enabled for this type
        inapp_enabled = check_channel_enabled(notification_type, 'inapp')
        
        notification = None
        
        if inapp_enabled:
            # Create the in-app notification
            notification = Notification.objects.create(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                related_report_id=kwargs.get('related_report_id'),
                related_subscription_id=kwargs.get('related_subscription_id'),
                related_message_id=kwargs.get('related_message_id'),
                related_announcement_id=kwargs.get('related_announcement_id'),
                related_site_id=kwargs.get('related_site_id'),
            )
            print(f"✅ In-app notification created: {notification_type} for {user.username}")
        else:
            print(f"🚫 In-app notification blocked for type: {notification_type}")
        
        # Send push notification if enabled
        if check_channel_enabled(notification_type, 'push'):
            try:
                from .push_service import send_push_notification
                url = kwargs.get('url', '/')
                send_push_notification(
                    user=user,
                    title=title,
                    message=message,
                    url=url,
                    notification_type=notification_type
                )
            except Exception as e:
                print(f"⚠️ Failed to send push notification: {e}")
        
        return notification

    @staticmethod
    def create_report_notification(user, report_id, report_title):
        """Create notification when a new report is assigned"""
        return NotificationService.create_notification(
            user=user,
            notification_type='report',
            title='New Report Available',
            message=f'A new report "{report_title}" has been assigned to you and is ready to view.',
            related_report_id=report_id
        )

    @staticmethod
    def create_subscription_expiry_notification(user, subscription_id, days_remaining):
        """Create notification when subscription is nearing expiry"""
        return NotificationService.create_notification(
            user=user,
            notification_type='subscription',
            title='Subscription Renewal Reminder',
            message=f'Your premium subscription will expire in {days_remaining} days. Please renew to continue enjoying our services.',
            related_subscription_id=subscription_id
        )

    @staticmethod
    def create_message_notification(user, message_id, sender_name):
        """Create notification when user receives a message from admin"""
        return NotificationService.create_notification(
            user=user,
            notification_type='message',
            title='New Message from Admin',
            message=f'You have received a new message from {sender_name}.',
            related_message_id=message_id
        )

    @staticmethod
    def create_announcement_notification(user, announcement_id, announcement_title):
        """Create notification for site announcements"""
        return NotificationService.create_notification(
            user=user,
            notification_type='announcement',
            title='New Announcement',
            message=f'{announcement_title}',
            related_announcement_id=announcement_id
        )

    @staticmethod
    def create_payment_notification(user, amount, status_text='successful'):
        """Create notification for payment updates"""
        return NotificationService.create_notification(
            user=user,
            notification_type='payment',
            title=f'Payment {status_text.capitalize()}',
            message=f'Your payment of ${amount} has been {status_text}.'
        )

    @staticmethod
    def create_system_notification(user, title, message):
        """Create general system notification"""
        return NotificationService.create_notification(
            user=user,
            notification_type='system',
            title=title,
            message=message
        )

    @staticmethod
    def broadcast_announcement_to_all_users(announcement_id, announcement_title, announcement_message):
        """Send announcement notification to all users"""
        # Check if notifications are allowed
        is_allowed, _ = check_notification_allowed('announcement')
        if not is_allowed:
            print(f"🚫 Broadcast announcement blocked by settings")
            return
        
        users = User.objects.filter(is_active=True)
        notifications = []
        
        for user in users:
            # Check per-user if needed
            if check_channel_enabled('announcement', 'inapp'):
                notifications.append(
                    Notification(
                        user=user,
                        notification_type='announcement',
                        title=announcement_title,
                        message=announcement_message,
                        related_announcement_id=announcement_id
                    )
                )
        
        if notifications:
            Notification.objects.bulk_create(notifications)
            print(f"✅ Broadcast announcement sent to {len(notifications)} users")

    @staticmethod
    def send_email_notification(user, subject, message, notification_type='system'):
        """Send email notification to user"""
        # Check if email is allowed
        if not check_channel_enabled(notification_type, 'email'):
            print(f"🚫 Email notification blocked for type: {notification_type}")
            return False
        
        try:
            from dashboard.models import NotificationSettings
            global_settings = NotificationSettings.get_settings()
            from_email = global_settings.get('email_from_name', 'Zeugma Platform')
        except:
            from_email = settings.DEFAULT_FROM_EMAIL
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[user.email],
                fail_silently=True,
            )
            return True
        except Exception as e:
            print(f"❌ Error sending email: {e}")
            return False
