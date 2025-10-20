from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .services import NotificationService


@shared_task
def check_subscription_expiry():
    """
    Celery task to check for subscriptions expiring soon
    Run this daily
    """
    from reports.models import Subscription, SubscriptionPlan

    today = timezone.now().date()

    # Check for annual subscriptions expiring in 30 days
    thirty_days_from_now = today + timedelta(days=30)

    annual_expiring = Subscription.objects.filter(
        plan=SubscriptionPlan.ANNUAL,
        end_date__lte=thirty_days_from_now,
        end_date__gte=today,
        status='ACTIVE'
    )

    for subscription in annual_expiring:
        days_remaining = (subscription.end_date - today).days

        # Only create notification if we haven't already notified today
        # You might want to add a check to prevent duplicate notifications
        NotificationService.create_subscription_expiry_notification(
            user=subscription.client,
            subscription_id=subscription.id,
            days_remaining=days_remaining
        )
        print(f"✅ Annual subscription reminder sent to {subscription.client.username} ({days_remaining} days)")

    # Check for monthly subscriptions expiring in 15 days
    fifteen_days_from_now = today + timedelta(days=15)

    monthly_expiring = Subscription.objects.filter(
        plan=SubscriptionPlan.MONTHLY,
        end_date__lte=fifteen_days_from_now,
        end_date__gte=today,
        status='ACTIVE'
    )

    for subscription in monthly_expiring:
        days_remaining = (subscription.end_date - today).days

        NotificationService.create_subscription_expiry_notification(
            user=subscription.client,
            subscription_id=subscription.id,
            days_remaining=days_remaining
        )
        print(f"✅ Monthly subscription reminder sent to {subscription.client.username} ({days_remaining} days)")


@shared_task
def send_report_notification(user_id, report_id, report_title):
    """
    Celery task to send report notification
    Call this when a new report is created/assigned
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        NotificationService.create_report_notification(
            user=user,
            report_id=report_id,
            report_title=report_title
        )
    except User.DoesNotExist:
        pass