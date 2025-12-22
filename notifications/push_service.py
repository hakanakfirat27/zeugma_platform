# notifications/push_service.py
"""
Web Push Notification Service
Handles sending push notifications to subscribed browsers/devices.
"""

import json
from django.conf import settings
from .models import PushSubscription


def get_vapid_keys():
    """
    Get VAPID keys from Django settings.
    These should be generated once and stored in settings/environment variables.
    """
    return {
        'public_key': getattr(settings, 'VAPID_PUBLIC_KEY', None),
        'private_key': getattr(settings, 'VAPID_PRIVATE_KEY', None),
        'claims_email': getattr(settings, 'VAPID_CLAIMS_EMAIL', 'admin@zeugma.com'),
    }


def send_push_notification(user, title, message, url=None, icon=None, tag=None, notification_type='system'):
    """
    Send push notification to all active subscriptions for a user.
    
    Args:
        user: User object to send notification to
        title: Notification title
        message: Notification body text
        url: URL to open when notification is clicked
        icon: Icon URL for the notification
        tag: Tag to group/replace similar notifications
        notification_type: Type of notification for categorization
    
    Returns:
        dict with success count and failed subscriptions
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        print("❌ pywebpush not installed. Run: pip install pywebpush")
        return {'success': 0, 'failed': 0, 'error': 'pywebpush not installed'}
    
    # Check if push notifications are enabled
    try:
        from notifications.services import check_notification_allowed, check_channel_enabled
        
        is_allowed, _ = check_notification_allowed(notification_type)
        if not is_allowed:
            print(f"🚫 Push notification blocked: notifications disabled globally")
            return {'success': 0, 'failed': 0, 'blocked': True}
        
        if not check_channel_enabled(notification_type, 'push'):
            print(f"🚫 Push notification blocked for type: {notification_type}")
            return {'success': 0, 'failed': 0, 'blocked': True}
    except Exception as e:
        print(f"⚠️ Could not check push settings: {e}")
    
    # Get VAPID keys
    vapid_keys = get_vapid_keys()
    if not vapid_keys['public_key'] or not vapid_keys['private_key']:
        print("❌ VAPID keys not configured")
        return {'success': 0, 'failed': 0, 'error': 'VAPID keys not configured'}
    
    # Get user's active subscriptions
    subscriptions = PushSubscription.objects.filter(
        user=user,
        is_active=True
    )
    
    if not subscriptions.exists():
        print(f"ℹ️ No push subscriptions for user {user.username}")
        return {'success': 0, 'failed': 0, 'no_subscriptions': True}
    
    # Prepare notification payload
    payload = json.dumps({
        'title': title,
        'body': message,
        'icon': icon or '/logo192.png',
        'badge': '/badge72.png',
        'tag': tag or notification_type,
        'url': url or '/',
        'notification_type': notification_type,
        'timestamp': int(__import__('time').time() * 1000),
    })
    
    success_count = 0
    failed_subscriptions = []
    
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info=subscription.get_subscription_info(),
                data=payload,
                vapid_private_key=vapid_keys['private_key'],
                vapid_claims={
                    'sub': f"mailto:{vapid_keys['claims_email']}"
                }
            )
            subscription.last_used = __import__('django.utils.timezone', fromlist=['now']).now()
            subscription.save(update_fields=['last_used'])
            success_count += 1
            print(f"✅ Push sent to {user.username} ({subscription.device_name or 'device'})")
            
        except WebPushException as e:
            print(f"❌ Push failed for subscription {subscription.id}: {e}")
            
            # If subscription is invalid (410 Gone or 404), deactivate it
            if e.response and e.response.status_code in [404, 410]:
                subscription.is_active = False
                subscription.save(update_fields=['is_active'])
                print(f"🗑️ Deactivated invalid subscription {subscription.id}")
            
            failed_subscriptions.append(str(subscription.id))
            
        except Exception as e:
            print(f"❌ Unexpected error sending push: {e}")
            failed_subscriptions.append(str(subscription.id))
    
    return {
        'success': success_count,
        'failed': len(failed_subscriptions),
        'failed_ids': failed_subscriptions
    }


def send_push_to_users(users, title, message, **kwargs):
    """
    Send push notification to multiple users.
    
    Args:
        users: List or QuerySet of User objects
        title: Notification title
        message: Notification body
        **kwargs: Additional arguments passed to send_push_notification
    
    Returns:
        dict with total success and failed counts
    """
    total_success = 0
    total_failed = 0
    
    for user in users:
        result = send_push_notification(user, title, message, **kwargs)
        total_success += result.get('success', 0)
        total_failed += result.get('failed', 0)
    
    return {
        'total_success': total_success,
        'total_failed': total_failed,
        'users_count': len(users) if hasattr(users, '__len__') else users.count()
    }


def send_push_to_role(role, title, message, **kwargs):
    """
    Send push notification to all users with a specific role.
    
    Args:
        role: User role (e.g., 'STAFF_ADMIN', 'CLIENT')
        title: Notification title
        message: Notification body
        **kwargs: Additional arguments
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    users = User.objects.filter(role=role, is_active=True)
    return send_push_to_users(users, title, message, **kwargs)


def generate_vapid_keys():
    """
    Generate new VAPID keys. Run this once to set up push notifications.
    
    Usage:
        python manage.py shell
        >>> from notifications.push_service import generate_vapid_keys
        >>> generate_vapid_keys()
    
    Then add the output to your settings.py or .env file.
    """
    try:
        from py_vapid import Vapid
        
        vapid = Vapid()
        vapid.generate_keys()
        
        print("\n" + "="*60)
        print("VAPID KEYS GENERATED - Add these to your settings.py or .env")
        print("="*60)
        print(f"\nVAPID_PUBLIC_KEY = '{vapid.public_key}'")
        print(f"\nVAPID_PRIVATE_KEY = '{vapid.private_key}'")
        print(f"\nVAPID_CLAIMS_EMAIL = 'admin@yourdomain.com'")
        print("\n" + "="*60)
        
        return {
            'public_key': vapid.public_key,
            'private_key': vapid.private_key
        }
    except ImportError:
        print("❌ py_vapid not installed. Run: pip install py_vapid")
        return None
    except Exception as e:
        print(f"❌ Error generating VAPID keys: {e}")
        
        # Alternative method using pywebpush
        try:
            from pywebpush import webpush
            import base64
            import ecdsa
            
            # Generate a private key
            private_key = ecdsa.SigningKey.generate(curve=ecdsa.NIST256p)
            public_key = private_key.get_verifying_key()
            
            # Convert to base64url
            private_key_b64 = base64.urlsafe_b64encode(
                private_key.to_string()
            ).decode('utf-8').rstrip('=')
            
            public_key_b64 = base64.urlsafe_b64encode(
                b'\x04' + public_key.to_string()
            ).decode('utf-8').rstrip('=')
            
            print("\n" + "="*60)
            print("VAPID KEYS GENERATED (Alternative Method)")
            print("="*60)
            print(f"\nVAPID_PUBLIC_KEY = '{public_key_b64}'")
            print(f"\nVAPID_PRIVATE_KEY = '{private_key_b64}'")
            print(f"\nVAPID_CLAIMS_EMAIL = 'admin@yourdomain.com'")
            print("\n" + "="*60)
            
            return {
                'public_key': public_key_b64,
                'private_key': private_key_b64
            }
        except Exception as e2:
            print(f"❌ Alternative method also failed: {e2}")
            return None
