# reports/management/commands/import_companies_excel.py
"""
Management command to import companies from Excel file with multiple sheets.

Usage:
    python manage.py import_companies_excel "C:\path\to\Companies.xlsx"
    python manage.py import_companies_excel "C:\path\to\Companies.xlsx" --clear-first
    python manage.py import_companies_excel "C:\path\to\Companies.xlsx" --report "C:\path\to\duplicates.xlsx"
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import models
from reports.services.company_import import CompanyImportService
from reports.company_models import (
    Company, ProductionSite, ProductionSiteVersion,
    CompanyNote, CompanyHistory
)
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Import companies from Excel file with multiple sheets (one per category)'

    def add_arguments(self, parser):
        parser.add_argument(
            'excel_file',
            type=str,
            help='Path to the Excel file to import'
        )
        parser.add_argument(
            '--clear-first',
            action='store_true',
            help='Clear all existing company data before importing',
        )
        parser.add_argument(
            '--user',
            type=str,
            default=None,
            help='Username to use for import (default: first SUPERADMIN)',
        )
        parser.add_argument(
            '--report',
            type=str,
            default=None,
            help='Path to save potential duplicates report (Excel file)',
        )

    def handle(self, *args, **options):
        excel_file = options['excel_file']
        report_path = options.get('report')
        
        # Validate file exists
        if not os.path.exists(excel_file):
            raise CommandError(f'File not found: {excel_file}')
        
        # Auto-generate report path if not provided
        if report_path is None:
            base_dir = os.path.dirname(excel_file)
            report_path = os.path.join(base_dir, 'potential_duplicates_report.xlsx')
        
        # Get user
        if options['user']:
            user = User.objects.filter(username=options['user']).first()
            if not user:
                raise CommandError(f'User not found: {options["user"]}')
        else:
            user = User.objects.filter(role='SUPERADMIN').first()
            if not user:
                user = User.objects.first()
        
        if not user:
            raise CommandError('No users found. Please create a user first.')
        
        self.stdout.write(f'Using user: {user.username}')
        self.stdout.write(f'Importing from: {excel_file}')
        self.stdout.write(f'Duplicates report will be saved to: {report_path}')
        self.stdout.write('')
        
        # Clear data if requested (in batches to avoid SQLite limit)
        if options['clear_first']:
            self.stdout.write(self.style.WARNING('Clearing existing company data...'))
            
            # Delete in batches to avoid SQLite "too many SQL variables" error
            batch_size = 500
            
            # CompanyHistory (uses history_id as primary key)
            while True:
                ids = list(CompanyHistory.objects.values_list('pk', flat=True)[:batch_size])
                if not ids:
                    break
                CompanyHistory.objects.filter(pk__in=ids).delete()
            self.stdout.write('  Deleted all history entries')
            
            # CompanyNote
            while True:
                ids = list(CompanyNote.objects.values_list('pk', flat=True)[:batch_size])
                if not ids:
                    break
                CompanyNote.objects.filter(pk__in=ids).delete()
            self.stdout.write('  Deleted all notes')
            
            # ProductionSiteVersion
            while True:
                ids = list(ProductionSiteVersion.objects.values_list('pk', flat=True)[:batch_size])
                if not ids:
                    break
                ProductionSiteVersion.objects.filter(pk__in=ids).delete()
            self.stdout.write('  Deleted all versions')
            
            # ProductionSite
            while True:
                ids = list(ProductionSite.objects.values_list('pk', flat=True)[:batch_size])
                if not ids:
                    break
                ProductionSite.objects.filter(pk__in=ids).delete()
            self.stdout.write('  Deleted all production sites')
            
            # Company
            while True:
                ids = list(Company.objects.values_list('pk', flat=True)[:batch_size])
                if not ids:
                    break
                Company.objects.filter(pk__in=ids).delete()
            self.stdout.write('  Deleted all companies')
            
            self.stdout.write(self.style.SUCCESS('Data cleared.'))
            self.stdout.write('')
        
        # Show current counts
        self.stdout.write('Current database counts:')
        self.stdout.write(f'  - Companies: {Company.objects.count()}')
        self.stdout.write(f'  - Production Sites: {ProductionSite.objects.count()}')
        self.stdout.write(f'  - Versions: {ProductionSiteVersion.objects.count()}')
        self.stdout.write('')
        
        # Run import
        self.stdout.write('Starting import...')
        self.stdout.write('')
        
        result = CompanyImportService.import_from_excel(excel_file, user, report_path)
        
        # Display results
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('IMPORT RESULTS'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        
        self.stdout.write(f'Total rows processed: {result["total_rows"]}')
        self.stdout.write('')
        
        self.stdout.write('Sheets processed:')
        for sheet in result['sheets_processed']:
            self.stdout.write(f'  - {sheet["name"]} → {sheet["category"]}')
        self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS(f'Companies created: {result["companies_created"]}'))
        self.stdout.write(self.style.SUCCESS(f'Companies updated: {result["companies_updated"]}'))
        self.stdout.write(self.style.SUCCESS(f'Exact matches merged (all 29 fields same): {result["merged_count"]}'))
        self.stdout.write(self.style.SUCCESS(f'Production sites created: {result["sites_created"]}'))
        self.stdout.write(self.style.SUCCESS(f'Versions created: {result["versions_created"]}'))
        self.stdout.write('')
        
        # Potential duplicates info
        potential_dups = result.get('potential_duplicates', [])
        if potential_dups:
            self.stdout.write(self.style.WARNING(f'Potential duplicates found: {len(potential_dups)}'))
            self.stdout.write(self.style.WARNING(f'  (Same name+address+country but different fields)'))
            self.stdout.write(self.style.WARNING(f'  Report saved to: {report_path}'))
            self.stdout.write('')
            
            # Show first 5 examples
            self.stdout.write('Sample potential duplicates:')
            for i, dup in enumerate(potential_dups[:5]):
                new_rec = dup['new_record']
                existing_rec = dup['existing_record']
                diff_fields = [d['field'] for d in dup['differences']]
                self.stdout.write(f'  {i+1}. "{new_rec["data"]["company_name"]}" ({new_rec["category"]})')
                self.stdout.write(f'      Existing: {existing_rec["unique_key"]} ({", ".join(existing_rec["categories"])})')
                self.stdout.write(f'      Differences: {", ".join(diff_fields)}')
            if len(potential_dups) > 5:
                self.stdout.write(f'  ... and {len(potential_dups) - 5} more (see report)')
            self.stdout.write('')
        else:
            self.stdout.write(self.style.SUCCESS('No potential duplicates found.'))
            self.stdout.write('')
        
        if result['errors']:
            self.stdout.write(self.style.ERROR(f'Errors: {len(result["errors"])}'))
            for i, err in enumerate(result['errors'][:20]):  # Show first 20 errors
                sheet = err.get('sheet', 'Unknown')
                row = err.get('row', '?')
                company = err.get('company', 'Unknown')
                error = err.get('error', 'Unknown error')
                self.stdout.write(f'  {i+1}. [{sheet}] Row {row} ({company}): {error}')
            
            if len(result['errors']) > 20:
                self.stdout.write(f'  ... and {len(result["errors"]) - 20} more errors')
        else:
            self.stdout.write(self.style.SUCCESS('No errors!'))
        
        self.stdout.write('')
        self.stdout.write('Final database counts:')
        self.stdout.write(f'  - Companies: {Company.objects.count()}')
        self.stdout.write(f'  - Production Sites: {ProductionSite.objects.count()}')
        self.stdout.write(f'  - Versions: {ProductionSiteVersion.objects.count()}')
        
        # Show sample of merged companies (exact matches with multiple categories)
        from django.db.models import Count
        merged_companies = Company.objects.annotate(
            site_count=Count('production_sites')
        ).filter(site_count__gt=1).order_by('-site_count')[:10]
        
        if merged_companies:
            self.stdout.write('')
            self.stdout.write('Sample of merged companies (multiple categories, exact match on all 29 fields):')
            for c in merged_companies:
                sites = list(c.production_sites.values_list('category', flat=True))
                self.stdout.write(f'  - {c.company_name} ({c.country}): {sites}')
