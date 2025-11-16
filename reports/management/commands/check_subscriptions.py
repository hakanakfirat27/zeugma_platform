"""
Management command to check subscriptions and send email notifications.

Usage:
    python manage.py check_subscriptions
    python manage.py check_subscriptions --send-emails

Run this daily via cron job:
    0 9 * * * cd /path/to/project && python manage.py check_subscriptions --send-emails
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from reports.models import Subscription
from reports.subscription_emails import (
    send_subscription_expiring_warning,
    send_subscription_expired_email
)


class Command(BaseCommand):
    help = 'Check subscription statuses and send email notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-emails',
            action='store_true',
            help='Actually send emails (default is dry-run)',
        )

    def handle(self, *args, **options):
        send_emails = options['send_emails']
        today = timezone.now().date()

        self.stdout.write('=' * 60)
        self.stdout.write(
            self.style.SUCCESS(f'\n📅 Checking Subscriptions - {today}\n')
        )
        self.stdout.write('=' * 60)

        if not send_emails:
            self.stdout.write(
                self.style.WARNING(
                    '\n⚠️  DRY RUN MODE - No emails will be sent'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    'Use --send-emails flag to actually send notifications\n'
                )
            )

        # Check for subscriptions expiring in 30, 7, or 1 day(s)
        warning_days = [30, 7, 1]
        total_warnings = 0

        for days in warning_days:
            target_date = today + timedelta(days=days)

            subscriptions = Subscription.objects.filter(
                end_date=target_date,
                start_date__lte=today
            ).select_related('client', 'report')

            count = subscriptions.count()

            if count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n⚠️  {count} subscription(s) expiring in {days} day(s):'
                    )
                )

                for subscription in subscriptions:
                    self.stdout.write(
                        f'   - {subscription.client.username}: '
                        f'{subscription.report.title} '
                        f'(expires: {subscription.end_date})'
                    )

                    if send_emails:
                        try:
                            send_subscription_expiring_warning(subscription, days)
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'     ✓ Email sent to {subscription.client.email}'
                                )
                            )
                            total_warnings += 1
                        except Exception as e:
                            self.stdout.write(
                                self.style.ERROR(
                                    f'     ✗ Failed to send email: {e}'
                                )
                            )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'     ○ Would send {days}-day warning to {subscription.client.email}'
                            )
                        )

        # Check for newly expired subscriptions
        expired_yesterday = today - timedelta(days=1)
        expired_subscriptions = Subscription.objects.filter(
            end_date=expired_yesterday
        ).select_related('client', 'report')

        expired_count = expired_subscriptions.count()

        if expired_count > 0:
            self.stdout.write(
                self.style.ERROR(
                    f'\n❌ {expired_count} subscription(s) expired yesterday:'
                )
            )

            for subscription in expired_subscriptions:
                self.stdout.write(
                    f'   - {subscription.client.username}: '
                    f'{subscription.report.title} '
                    f'(expired: {subscription.end_date})'
                )

                if send_emails:
                    try:
                        send_subscription_expired_email(subscription)
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'     ✓ Expiration notice sent to {subscription.client.email}'
                            )
                        )
                        total_warnings += 1
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f'     ✗ Failed to send email: {e}'
                            )
                        )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'     ○ Would send expiration notice to {subscription.client.email}'
                        )
                    )

        # Get statistics
        active_count = Subscription.objects.filter(
            start_date__lte=today,
            end_date__gte=today
        ).count()

        expiring_soon_count = Subscription.objects.filter(
            end_date__gt=today,
            end_date__lte=today + timedelta(days=30)
        ).count()

        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(
            self.style.SUCCESS('\n📊 Summary:\n')
        )
        self.stdout.write(f'   Active Subscriptions: {active_count}')
        self.stdout.write(f'   Expiring in 30 days: {expiring_soon_count}')

        if send_emails:
            self.stdout.write(
                self.style.SUCCESS(
                    f'   Emails Sent: {total_warnings}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'   Emails That Would Be Sent: {total_warnings + expired_count}'
                )
            )

        self.stdout.write('\n' + '=' * 60)

        if send_emails:
            self.stdout.write(
                self.style.SUCCESS(
                    '\n✓ Subscription check completed with email notifications!\n'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    '\n○ Dry run completed. Use --send-emails to send notifications.\n'
                )
            )