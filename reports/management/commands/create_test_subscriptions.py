"""
Management command to create test subscriptions for client dashboard testing.

Usage:
    python manage.py create_test_subscriptions --username client_user
    python manage.py create_test_subscriptions --username client_user --reports 5
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from accounts.models import User, UserRole
from reports.models import CustomReport, Subscription, SubscriptionPlan, SubscriptionStatus


class Command(BaseCommand):
    help = 'Creates test custom reports and subscriptions for a client user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the client to create subscriptions for',
            required=True
        )
        parser.add_argument(
            '--reports',
            type=int,
            default=3,
            help='Number of test reports to create (default: 3)'
        )

    def handle(self, *args, **options):
        username = options['username']
        num_reports = options['reports']

        # Get or create client user
        try:
            client = User.objects.get(username=username)
            if client.role != UserRole.CLIENT:
                self.stdout.write(
                    self.style.WARNING(f'User {username} is not a CLIENT. Updating role...')
                )
                client.role = UserRole.CLIENT
                client.save()
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User {username} does not exist. Creating...')
            )
            client = User.objects.create_user(
                username=username,
                password='testpass123',
                role=UserRole.CLIENT,
                email=f'{username}@example.com',
                first_name='Test',
                last_name='Client'
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created client user: {username} (password: testpass123)')
            )

        # Define test reports with various filter criteria
        test_reports = [
            {
                'title': 'German PVC Injection Moulders',
                'description': 'Complete database of PVC injection moulding companies in Germany with automotive applications',
                'filter_criteria': {
                    'country': 'Germany',
                    'category': 'INJECTION',
                    'pvc': True,
                    'automotive': True
                },
                'monthly_price': Decimal('99.99'),
                'annual_price': Decimal('999.99')
            },
            {
                'title': 'European Pipe Extruders',
                'description': 'PE and PP pipe extrusion manufacturers across Europe',
                'filter_criteria': {
                    'category': 'PIPE',
                    'region': 'Europe'
                },
                'monthly_price': Decimal('149.99'),
                'annual_price': Decimal('1499.99')
            },
            {
                'title': 'UK Packaging Manufacturers',
                'description': 'Companies specializing in packaging applications in the United Kingdom',
                'filter_criteria': {
                    'country': 'United Kingdom',
                    'packaging': True
                },
                'monthly_price': Decimal('79.99'),
                'annual_price': Decimal('799.99')
            },
            {
                'title': 'Medical Device Moulders - USA',
                'description': 'US-based injection and blow moulders serving the medical industry',
                'filter_criteria': {
                    'country': 'United States',
                    'medical': True
                },
                'monthly_price': Decimal('199.99'),
                'annual_price': Decimal('1999.99')
            },
            {
                'title': 'Asian PP Compounders',
                'description': 'Polypropylene compounding facilities in Asia Pacific region',
                'filter_criteria': {
                    'category': 'COMPOUNDER',
                    'pp': True,
                    'region': 'Asia'
                },
                'monthly_price': Decimal('129.99'),
                'annual_price': Decimal('1299.99')
            },
            {
                'title': 'Italian Automotive Suppliers',
                'description': 'Italian manufacturers supplying automotive components',
                'filter_criteria': {
                    'country': 'Italy',
                    'automotive': True
                },
                'monthly_price': Decimal('89.99'),
                'annual_price': Decimal('899.99')
            },
            {
                'title': 'French Food Packaging Specialists',
                'description': 'French companies producing food packaging solutions',
                'filter_criteria': {
                    'country': 'France',
                    'food_drink': True,
                    'packaging': True
                },
                'monthly_price': Decimal('109.99'),
                'annual_price': Decimal('1099.99')
            },
            {
                'title': 'Global PET Manufacturers',
                'description': 'Worldwide manufacturers working with PET materials',
                'filter_criteria': {
                    'pet': True
                },
                'monthly_price': Decimal('159.99'),
                'annual_price': Decimal('1599.99')
            },
        ]

        # Create reports and subscriptions
        today = timezone.now().date()
        created_count = 0

        for i in range(min(num_reports, len(test_reports))):
            report_data = test_reports[i]

            # Create or get report
            report, created = CustomReport.objects.get_or_create(
                title=report_data['title'],
                defaults={
                    'description': report_data['description'],
                    'filter_criteria': report_data['filter_criteria'],
                    'monthly_price': report_data['monthly_price'],
                    'annual_price': report_data['annual_price'],
                    'is_active': True,
                    'is_featured': i < 3,  # First 3 are featured
                    'created_by': User.objects.filter(role=UserRole.SUPERADMIN).first()
                }
            )

            if created:
                # Update record count
                report.update_record_count()
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created report: {report.title} ({report.record_count} records)')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'○ Report already exists: {report.title}')
                )

            # Determine subscription plan (alternate between monthly and annual)
            plan = SubscriptionPlan.MONTHLY if i % 2 == 0 else SubscriptionPlan.ANNUAL

            # Calculate dates
            start_date = today
            if plan == SubscriptionPlan.MONTHLY:
                end_date = today + timedelta(days=30)
                amount_paid = report.monthly_price
            else:
                end_date = today + timedelta(days=365)
                amount_paid = report.annual_price

            # Create subscription if it doesn't exist
            subscription, sub_created = Subscription.objects.get_or_create(
                client=client,
                report=report,
                start_date=start_date,
                defaults={
                    'plan': plan,
                    'status': SubscriptionStatus.ACTIVE,
                    'end_date': end_date,
                    'amount_paid': amount_paid,
                    'notes': 'Test subscription created by management command'
                }
            )

            if sub_created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Created {plan} subscription (expires: {subscription.end_date}, paid: ${subscription.amount_paid})'
                    )
                )
                created_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'  ○ Subscription already exists (expires: {subscription.end_date})'
                    )
                )

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Successfully created {created_count} new subscription(s) for {client.username}'
            )
        )

        total_subs = Subscription.objects.filter(
            client=client,
            status=SubscriptionStatus.ACTIVE,
            end_date__gte=today
        ).count()

        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Total active subscriptions: {total_subs}'
            )
        )
        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            self.style.WARNING(
                f'\nYou can now login as: {client.username}'
            )
        )
        if created_count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'Password: testpass123 (if newly created user)'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    f'\nAccess the client dashboard at: /client-dashboard'
                )
            )