"""
Email notification system for subscription management.
Sends notifications for:
- Subscription activation
- Expiration warnings (30, 7, 1 day before)
- Subscription expiration
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Subscription


def send_subscription_activated_email(subscription):
    """Send email when subscription is activated"""
    subject = f'Your Subscription to {subscription.report.title} is Active'

    context = {
        'client_name': subscription.client.get_full_name() or subscription.client.username,
        'report_title': subscription.report.title,
        'report_description': subscription.report.description,
        'start_date': subscription.start_date,
        'end_date': subscription.end_date,
        'days_duration': (subscription.end_date - subscription.start_date).days,
        'dashboard_url': f'{settings.FRONTEND_URL}/client-dashboard' if hasattr(settings,
                                                                                'FRONTEND_URL') else 'http://localhost:5173/client-dashboard'
    }

    # HTML email
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">🎉 Subscription Activated!</h1>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
                <p style="font-size: 16px;">Hi {context['client_name']},</p>

                <p style="font-size: 16px;">Your subscription to <strong>{context['report_title']}</strong> is now active!</p>

                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #1e40af;"><strong>Report:</strong> {context['report_title']}</p>
                    <p style="margin: 5px 0; color: #1e40af;"><strong>Valid From:</strong> {context['start_date']}</p>
                    <p style="margin: 5px 0; color: #1e40af;"><strong>Valid Until:</strong> {context['end_date']}</p>
                    <p style="margin: 5px 0; color: #1e40af;"><strong>Duration:</strong> {context['days_duration']} days</p>
                </div>

                <p style="font-size: 16px;">{context['report_description']}</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{context['dashboard_url']}" 
                       style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); 
                              color: white; padding: 15px 30px; text-decoration: none; 
                              border-radius: 8px; font-weight: bold; display: inline-block;">
                        Access Your Reports →
                    </a>
                </div>

                <p style="font-size: 14px; color: #6b7280;">
                    You can now access this report and apply various filters to explore the data. 
                    Visualizations and export features are also available.
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p>This is an automated message from Zeugma Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    plain_message = f"""
    Hi {context['client_name']},

    Your subscription to {context['report_title']} is now active!

    Report: {context['report_title']}
    Valid From: {context['start_date']}
    Valid Until: {context['end_date']}
    Duration: {context['days_duration']} days

    {context['report_description']}

    Access your reports here: {context['dashboard_url']}

    Best regards,
    Zeugma Platform
    """

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[subscription.client.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_subscription_expiring_warning(subscription, days_until_expiry):
    """Send warning email before subscription expires"""
    subject = f'⚠️ Your Subscription Expires in {days_until_expiry} Day{"s" if days_until_expiry != 1 else ""}'

    context = {
        'client_name': subscription.client.get_full_name() or subscription.client.username,
        'report_title': subscription.report.title,
        'end_date': subscription.end_date,
        'days_until_expiry': days_until_expiry,
        'dashboard_url': f'{settings.FRONTEND_URL}/client-dashboard' if hasattr(settings,
                                                                                'FRONTEND_URL') else 'http://localhost:5173/client-dashboard'
    }

    urgency_color = '#ef4444' if days_until_expiry <= 7 else '#f59e0b'
    urgency_icon = '🚨' if days_until_expiry <= 7 else '⚠️'

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: {urgency_color}; padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">{urgency_icon} Subscription Expiring Soon</h1>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
                <p style="font-size: 16px;">Hi {context['client_name']},</p>

                <p style="font-size: 16px;">Your subscription to <strong>{context['report_title']}</strong> will expire in <strong style="color: {urgency_color};">{days_until_expiry} day{"s" if days_until_expiry != 1 else ""}</strong>.</p>

                <div style="background-color: #fef2f2; border-left: 4px solid {urgency_color}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b;"><strong>Report:</strong> {context['report_title']}</p>
                    <p style="margin: 5px 0; color: #991b1b;"><strong>Expires On:</strong> {context['end_date']}</p>
                </div>

                <p style="font-size: 16px;">To continue accessing this valuable data, please contact us to renew your subscription.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{context['dashboard_url']}" 
                       style="background-color: {urgency_color}; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold; 
                              display: inline-block;">
                        View My Subscriptions
                    </a>
                </div>

                <p style="font-size: 14px; color: #6b7280;">
                    Don't lose access to your data! Contact our sales team today to discuss renewal options.
                </p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p>This is an automated message from Zeugma Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    plain_message = f"""
    Hi {context['client_name']},

    Your subscription to {context['report_title']} will expire in {days_until_expiry} day{"s" if days_until_expiry != 1 else ""}.

    Report: {context['report_title']}
    Expires On: {context['end_date']}

    To continue accessing this valuable data, please contact us to renew your subscription.

    View your subscriptions: {context['dashboard_url']}

    Best regards,
    Zeugma Platform
    """

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[subscription.client.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_subscription_expired_email(subscription):
    """Send email when subscription has expired"""
    subject = f'Your Subscription to {subscription.report.title} Has Expired'

    context = {
        'client_name': subscription.client.get_full_name() or subscription.client.username,
        'report_title': subscription.report.title,
        'end_date': subscription.end_date,
    }

    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #6b7280; padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">Subscription Expired</h1>
            </div>

            <div style="background-color: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
                <p style="font-size: 16px;">Hi {context['client_name']},</p>

                <p style="font-size: 16px;">Your subscription to <strong>{context['report_title']}</strong> has expired as of {context['end_date']}.</p>

                <p style="font-size: 16px;">You no longer have access to this report. To regain access, please contact us to renew your subscription.</p>

                <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong>Need help?</strong> Our sales team is here to assist you with renewal options and answer any questions.
                    </p>
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p>This is an automated message from Zeugma Platform</p>
            </div>
        </div>
    </body>
    </html>
    """

    plain_message = f"""
    Hi {context['client_name']},

    Your subscription to {context['report_title']} has expired as of {context['end_date']}.

    You no longer have access to this report. To regain access, please contact us to renew your subscription.

    Best regards,
    Zeugma Platform
    """

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[subscription.client.email],
        html_message=html_message,
        fail_silently=False,
    )


def check_and_send_expiration_warnings():
    """
    Check all subscriptions and send warning emails.
    This should be run as a daily cron job or scheduled task.
    """
    today = timezone.now().date()

    # Check for subscriptions expiring in 30, 7, or 1 day(s)
    warning_days = [30, 7, 1]

    for days in warning_days:
        target_date = today + timedelta(days=days)

        subscriptions = Subscription.objects.filter(
            end_date=target_date,
            start_date__lte=today  # Only active subscriptions
        )

        for subscription in subscriptions:
            try:
                send_subscription_expiring_warning(subscription, days)
                print(f'Sent {days}-day warning to {subscription.client.username}')
            except Exception as e:
                print(f'Failed to send warning to {subscription.client.username}: {e}')

    # Check for newly expired subscriptions (expired today)
    expired_today = Subscription.objects.filter(
        end_date=today - timedelta(days=1)
    )

    for subscription in expired_today:
        try:
            send_subscription_expired_email(subscription)
            print(f'Sent expiration notice to {subscription.client.username}')
        except Exception as e:
            print(f'Failed to send expiration notice to {subscription.client.username}: {e}')