from django.core.management.base import BaseCommand
from reports.email_notifications import send_daily_summary_to_staff

class Command(BaseCommand):
    help = 'Send daily summary email to staff'

    def handle(self, *args, **options):
        self.stdout.write('Sending daily summary...')
        success = send_daily_summary_to_staff()
        
        if success:
            self.stdout.write(
                self.style.SUCCESS('✅ Daily summary sent successfully')
            )
        else:
            self.stdout.write(
                self.style.ERROR('❌ Failed to send daily summary')
            )