# accounts/management/commands/cleanup_audit_logs.py
"""
Management command to cleanup old audit logs based on retention settings.

Usage:
    # Use retention days from SecuritySettings (default)
    python manage.py cleanup_audit_logs

    # Override with specific days
    python manage.py cleanup_audit_logs --days 30

    # Dry run (show what would be deleted without actually deleting)
    python manage.py cleanup_audit_logs --dry-run

    # Verbose output
    python manage.py cleanup_audit_logs --verbosity 2

Scheduling (Windows Task Scheduler or Linux cron):
    # Linux cron - run daily at 2 AM
    0 2 * * * cd /path/to/project && python manage.py cleanup_audit_logs

    # Windows Task Scheduler - create a task that runs:
    python manage.py cleanup_audit_logs
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.security_models import AuditLog, SecuritySettings, FailedLoginAttempt


class Command(BaseCommand):
    help = 'Cleanup old audit logs and failed login attempts based on retention settings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            help='Override retention days (uses SecuritySettings.audit_retention_days if not specified)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--include-failed-logins',
            action='store_true',
            default=True,
            help='Also cleanup old failed login attempts (default: True)',
        )

    def handle(self, *args, **options):
        # Get retention days
        if options['days']:
            retention_days = options['days']
            self.stdout.write(f"Using override retention: {retention_days} days")
        else:
            settings = SecuritySettings.get_settings()
            retention_days = settings.audit_retention_days
            self.stdout.write(f"Using settings retention: {retention_days} days")

        if retention_days <= 0:
            self.stdout.write(
                self.style.WARNING('Retention days is 0 or negative. No cleanup will be performed.')
            )
            return

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be deleted'))

        self.stdout.write(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
        self.stdout.write('-' * 50)

        # Cleanup Audit Logs
        audit_logs_to_delete = AuditLog.objects.filter(timestamp__lt=cutoff_date)
        audit_count = audit_logs_to_delete.count()

        if audit_count > 0:
            if dry_run:
                self.stdout.write(f"Would delete {audit_count} audit log entries")
            else:
                audit_logs_to_delete.delete()
                self.stdout.write(
                    self.style.SUCCESS(f"Deleted {audit_count} audit log entries")
                )
        else:
            self.stdout.write("No audit logs to delete")

        # Cleanup Failed Login Attempts
        if options['include_failed_logins']:
            failed_logins_to_delete = FailedLoginAttempt.objects.filter(attempted_at__lt=cutoff_date)
            failed_count = failed_logins_to_delete.count()

            if failed_count > 0:
                if dry_run:
                    self.stdout.write(f"Would delete {failed_count} failed login attempts")
                else:
                    failed_logins_to_delete.delete()
                    self.stdout.write(
                        self.style.SUCCESS(f"Deleted {failed_count} failed login attempts")
                    )
            else:
                self.stdout.write("No failed login attempts to delete")

        # Summary
        self.stdout.write('-' * 50)
        total_deleted = audit_count + (failed_count if options['include_failed_logins'] else 0)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"DRY RUN: Would have deleted {total_deleted} total records")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Cleanup complete! Deleted {total_deleted} total records")
            )

        # Log the cleanup action (if not dry run)
        if not dry_run and total_deleted > 0:
            AuditLog.log(
                event_type='settings_changed',
                description=f'Audit log cleanup: deleted {audit_count} audit logs and {failed_count if options["include_failed_logins"] else 0} failed login attempts older than {retention_days} days',
                severity='info',
                details={
                    'retention_days': retention_days,
                    'audit_logs_deleted': audit_count,
                    'failed_logins_deleted': failed_count if options['include_failed_logins'] else 0,
                    'cutoff_date': cutoff_date.isoformat()
                }
            )
