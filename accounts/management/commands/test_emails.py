# accounts/management/commands/test_emails.py
# Test script to send all email templates

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.email_notifications import (
    send_welcome_email,
    send_2fa_disabled_email,
    send_new_device_login_email,
    send_suspicious_login_email,
    send_account_locked_email,
    send_report_ready_email,
    send_system_announcement_email,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Test all email notification templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address to send test emails to (uses first superadmin if not specified)'
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['all', 'welcome', '2fa_disabled', 'new_device', 'suspicious', 
                     'account_locked', 'report_ready', 'announcement_info', 
                     'announcement_warning', 'announcement_success', 'announcement_urgent'],
            default='all',
            help='Type of email to test (default: all)'
        )

    def handle(self, *args, **options):
        email = options.get('email')
        email_type = options.get('type')
        
        # Get test user
        if email:
            user = User.objects.filter(email=email).first()
            if not user:
                self.stdout.write(self.style.ERROR(f'No user found with email: {email}'))
                return
        else:
            user = User.objects.filter(role='SUPERADMIN').first()
            if not user:
                user = User.objects.first()
            if not user:
                self.stdout.write(self.style.ERROR('No users found in database'))
                return
        
        self.stdout.write(self.style.SUCCESS(f'\n📧 Testing emails for: {user.email}\n'))
        self.stdout.write('=' * 60)
        
        # Test data
        test_ip = '203.0.113.42'
        test_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        
        results = []
        
        # 1. Welcome Email
        if email_type in ['all', 'welcome']:
            self.stdout.write('\n1️⃣  Testing Welcome Email...')
            success, error = send_welcome_email(user)
            results.append(('Welcome Email', success, error))
            self._print_result(success, error)
        
        # 2. 2FA Disabled Email
        if email_type in ['all', '2fa_disabled']:
            self.stdout.write('\n2️⃣  Testing 2FA Disabled Email...')
            success, error = send_2fa_disabled_email(user, test_ip, test_user_agent)
            results.append(('2FA Disabled Email', success, error))
            self._print_result(success, error)
        
        # 3. New Device Login Email
        if email_type in ['all', 'new_device']:
            self.stdout.write('\n3️⃣  Testing New Device Login Email...')
            success, error = send_new_device_login_email(user, test_ip, test_user_agent)
            results.append(('New Device Login Email', success, error))
            self._print_result(success, error)
        
        # 4. Suspicious Login Email
        if email_type in ['all', 'suspicious']:
            self.stdout.write('\n4️⃣  Testing Suspicious Login Email...')
            success, error = send_suspicious_login_email(user, test_ip, test_user_agent, 5)
            results.append(('Suspicious Login Email', success, error))
            self._print_result(success, error)
        
        # 5. Account Locked Email
        if email_type in ['all', 'account_locked']:
            self.stdout.write('\n5️⃣  Testing Account Locked Email...')
            success, error = send_account_locked_email(user, test_ip, test_user_agent, 5, 15)
            results.append(('Account Locked Email', success, error))
            self._print_result(success, error)
        
        # 6. Report Ready Email
        if email_type in ['all', 'report_ready']:
            self.stdout.write('\n6️⃣  Testing Report Ready Email...')
            success, error = send_report_ready_email(
                user, 
                'Q4 2024 Market Analysis Report',
                'http://localhost:5173/reports/123',
                'Comprehensive analysis of European plastics market including trends, forecasts, and company rankings.'
            )
            results.append(('Report Ready Email', success, error))
            self._print_result(success, error)
        
        # 7. System Announcement - Info
        if email_type in ['all', 'announcement_info']:
            self.stdout.write('\n7️⃣  Testing System Announcement (Info)...')
            success_count, fail_count = send_system_announcement_email(
                user,
                'Platform Update Available',
                'New Features Available',
                'We have released exciting new features including advanced filtering, bulk export capabilities, and improved dashboard performance. Update your experience today!',
                'http://localhost:5173/whats-new',
                'See What\'s New',
                'info'
            )
            results.append(('System Announcement (Info)', success_count > 0, None if success_count > 0 else 'Failed'))
            self._print_result(success_count > 0, None if success_count > 0 else 'Failed')
        
        # 8. System Announcement - Warning
        if email_type in ['all', 'announcement_warning']:
            self.stdout.write('\n8️⃣  Testing System Announcement (Warning)...')
            success_count, fail_count = send_system_announcement_email(
                user,
                'Scheduled Maintenance Notice',
                'Scheduled Maintenance',
                'We will be performing scheduled maintenance on <strong>December 25, 2024 from 2:00 AM to 6:00 AM UTC</strong>. The platform may be temporarily unavailable during this time. Please save your work before the maintenance window.',
                None,
                None,
                'warning'
            )
            results.append(('System Announcement (Warning)', success_count > 0, None if success_count > 0 else 'Failed'))
            self._print_result(success_count > 0, None if success_count > 0 else 'Failed')
        
        # 9. System Announcement - Success
        if email_type in ['all', 'announcement_success']:
            self.stdout.write('\n9️⃣  Testing System Announcement (Success)...')
            success_count, fail_count = send_system_announcement_email(
                user,
                'Data Collection Complete',
                'Project Completed Successfully',
                'Great news! The data collection for your <strong>European Plastics Market 2024</strong> project has been completed successfully. All 2,450 company records have been verified and are ready for review.',
                'http://localhost:5173/projects/123',
                'View Project Results',
                'success'
            )
            results.append(('System Announcement (Success)', success_count > 0, None if success_count > 0 else 'Failed'))
            self._print_result(success_count > 0, None if success_count > 0 else 'Failed')
        
        # 10. System Announcement - Urgent
        if email_type in ['all', 'announcement_urgent']:
            self.stdout.write('\n🔟 Testing System Announcement (Urgent)...')
            success_count, fail_count = send_system_announcement_email(
                user,
                'URGENT: Security Alert',
                'Important Security Update',
                'We have detected unusual activity patterns on the platform. As a precaution, we recommend all users to:<br><br>• Change your password immediately<br>• Enable Two-Factor Authentication<br>• Review your recent account activity<br><br>If you notice any unauthorized access, please contact support immediately.',
                'http://localhost:5173/settings/security',
                'Secure My Account Now',
                'urgent'
            )
            results.append(('System Announcement (Urgent)', success_count > 0, None if success_count > 0 else 'Failed'))
            self._print_result(success_count > 0, None if success_count > 0 else 'Failed')
        
        # Print summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('\n📊 TEST SUMMARY\n'))
        
        passed = sum(1 for _, success, _ in results if success)
        failed = len(results) - passed
        
        for name, success, error in results:
            status = '✅' if success else '❌'
            self.stdout.write(f'  {status} {name}')
        
        self.stdout.write(f'\n  Total: {len(results)} | Passed: {passed} | Failed: {failed}')
        
        if failed == 0:
            self.stdout.write(self.style.SUCCESS('\n🎉 All emails sent successfully!\n'))
        else:
            self.stdout.write(self.style.WARNING(f'\n⚠️  {failed} email(s) failed to send.\n'))
    
    def _print_result(self, success, error):
        if success:
            self.stdout.write(self.style.SUCCESS('   ✅ Sent successfully'))
        else:
            self.stdout.write(self.style.ERROR(f'   ❌ Failed: {error}'))
