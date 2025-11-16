from django.core.management.base import BaseCommand
from reports.models import CustomReport
from accounts.models import User, UserRole


class Command(BaseCommand):
    help = 'Creates sample custom reports'

    def handle(self, *args, **kwargs):
        # Get or create a staff user
        staff_user = User.objects.filter(role=UserRole.STAFF_ADMIN).first()

        if not staff_user:
            self.stdout.write(self.style.ERROR('No staff user found. Create a staff user first.'))
            return

        # Sample Report 1: European PVC Manufacturers
        report1, created = CustomReport.objects.get_or_create(
            title='European PVC Manufacturers',
            defaults={
                'description': 'Comprehensive database of PVC manufacturing companies across Europe',
                'filter_criteria': {
                    'pvc': True,
                    'country': ['Germany', 'France', 'Italy', 'United Kingdom', 'Spain']
                },
                'monthly_price': 99.99,
                'annual_price': 999.99,
                'is_active': True,
                'is_featured': True,
                'created_by': staff_user
            }
        )
        report1.update_record_count()

        # Sample Report 2: Asian Injection Moulders
        report2, created = CustomReport.objects.get_or_create(
            title='Asian Injection Moulders',
            defaults={
                'description': 'Complete directory of injection moulding companies in Asia',
                'filter_criteria': {
                    'category': 'INJECTION',
                    'country': ['China', 'Japan', 'South Korea', 'India', 'Thailand']
                },
                'monthly_price': 149.99,
                'annual_price': 1499.99,
                'is_active': True,
                'is_featured': True,
                'created_by': staff_user
            }
        )
        report2.update_record_count()

        self.stdout.write(self.style.SUCCESS('Successfully created sample reports'))