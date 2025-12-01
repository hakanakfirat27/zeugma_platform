# reports/management/commands/clear_company_data.py
"""
Management command to delete all company data.

Usage:
    python manage.py clear_company_data
    python manage.py clear_company_data --confirm
"""

from django.core.management.base import BaseCommand
from reports.company_models import (
    Company, ProductionSite, ProductionSiteVersion,
    CompanyNote, CompanyHistory
)


class Command(BaseCommand):
    help = 'Delete all company data (Companies, ProductionSites, Versions, Notes, History)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion without prompting',
        )

    def handle(self, *args, **options):
        # Show current counts
        self.stdout.write('\nCurrent data counts:')
        self.stdout.write(f'  - Companies: {Company.objects.count()}')
        self.stdout.write(f'  - Production Sites: {ProductionSite.objects.count()}')
        self.stdout.write(f'  - Versions: {ProductionSiteVersion.objects.count()}')
        self.stdout.write(f'  - Notes: {CompanyNote.objects.count()}')
        self.stdout.write(f'  - History: {CompanyHistory.objects.count()}')
        self.stdout.write('')

        if not options['confirm']:
            confirm = input('Are you sure you want to delete ALL company data? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Aborted.'))
                return

        self.stdout.write('Deleting data in batches...')
        batch_size = 500

        # Delete in order (child records first)
        # CompanyHistory (uses history_id as primary key)
        count = 0
        while True:
            ids = list(CompanyHistory.objects.values_list('pk', flat=True)[:batch_size])
            if not ids:
                break
            CompanyHistory.objects.filter(pk__in=ids).delete()
            count += len(ids)
        self.stdout.write(f'  Deleted {count} history entries')

        # CompanyNote
        count = 0
        while True:
            ids = list(CompanyNote.objects.values_list('pk', flat=True)[:batch_size])
            if not ids:
                break
            CompanyNote.objects.filter(pk__in=ids).delete()
            count += len(ids)
        self.stdout.write(f'  Deleted {count} notes')

        # ProductionSiteVersion
        count = 0
        while True:
            ids = list(ProductionSiteVersion.objects.values_list('pk', flat=True)[:batch_size])
            if not ids:
                break
            ProductionSiteVersion.objects.filter(pk__in=ids).delete()
            count += len(ids)
        self.stdout.write(f'  Deleted {count} versions')

        # ProductionSite
        count = 0
        while True:
            ids = list(ProductionSite.objects.values_list('pk', flat=True)[:batch_size])
            if not ids:
                break
            ProductionSite.objects.filter(pk__in=ids).delete()
            count += len(ids)
        self.stdout.write(f'  Deleted {count} production sites')

        # Company
        count = 0
        while True:
            ids = list(Company.objects.values_list('pk', flat=True)[:batch_size])
            if not ids:
                break
            Company.objects.filter(pk__in=ids).delete()
            count += len(ids)
        self.stdout.write(f'  Deleted {count} companies')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('All company data deleted successfully!'))
