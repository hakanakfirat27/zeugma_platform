# reports/management/commands/fix_report_scope.py
"""
Management command to fix existing reports by snapshotting their category/country scope.

This fixes the issue where reports created with "All Categories" or "All Countries" 
dynamically expand when new categories/countries are added to the database.

Usage:
    python manage.py fix_report_scope                    # List all reports that need fixing
    python manage.py fix_report_scope --apply            # Apply fixes to all reports
    python manage.py fix_report_scope --report-id UUID   # Fix a specific report
    python manage.py fix_report_scope --report-id UUID --apply  # Fix and save a specific report
"""

from django.core.management.base import BaseCommand
from django.db.models import Count
from reports.models import CustomReport
from reports.company_models import Company, CompanyStatus, ProductionSite
import json


class Command(BaseCommand):
    help = 'Fix existing reports by snapshotting their category/country scope'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Actually apply the fixes (without this flag, only shows what would be changed)'
        )
        parser.add_argument(
            '--report-id',
            type=str,
            help='Fix a specific report by its UUID'
        )

    def handle(self, *args, **options):
        apply = options['apply']
        report_id = options.get('report_id')

        if report_id:
            try:
                reports = CustomReport.objects.filter(report_id=report_id)
                if not reports.exists():
                    self.stdout.write(self.style.ERROR(f'Report with ID {report_id} not found'))
                    return
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Invalid report ID: {e}'))
                return
        else:
            reports = CustomReport.objects.all()

        fixed_count = 0
        for report in reports:
            criteria = report.filter_criteria or {}
            changes_made = []
            
            # Get the status filter to apply
            status_filter = criteria.get('status', ['COMPLETE'])
            if isinstance(status_filter, str):
                status_filter = [status_filter]
            
            # Build base queryset with status filter
            base_queryset = Company.objects.exclude(status=CompanyStatus.DELETED)
            if status_filter:
                base_queryset = base_queryset.filter(status__in=status_filter)
            
            # Check if categories need fixing
            categories = criteria.get('categories', [])
            if not categories or len(categories) == 0:
                # Get all categories that currently have companies matching status
                category_data = ProductionSite.objects.filter(
                    company__in=base_queryset
                ).values('category').annotate(
                    count=Count('company', distinct=True)
                ).filter(count__gt=0)
                
                available_categories = sorted([
                    item['category'] for item in category_data if item['category']
                ])
                
                if available_categories:
                    criteria['categories'] = available_categories
                    changes_made.append(f'categories: [] → {available_categories}')
            
            # Check if countries need fixing
            countries = criteria.get('country', [])
            if not countries or len(countries) == 0:
                # Get all countries that currently have companies matching status
                country_data = base_queryset.values('country').annotate(
                    count=Count('company_id')
                ).filter(count__gt=0, country__isnull=False).exclude(country='')
                
                available_countries = sorted([
                    item['country'] for item in country_data if item['country']
                ])
                
                if available_countries:
                    criteria['country'] = available_countries
                    changes_made.append(f'country: [] → {len(available_countries)} countries')
            
            # Report what would be/was changed
            if changes_made:
                self.stdout.write(f'\n📋 Report: {report.title} (ID: {report.report_id})')
                self.stdout.write(f'   Status filter: {status_filter}')
                for change in changes_made:
                    self.stdout.write(f'   ✏️  {change}')
                
                if apply:
                    report.filter_criteria = criteria
                    report.save(update_fields=['filter_criteria'])
                    # Update record count
                    report.update_record_count()
                    self.stdout.write(self.style.SUCCESS(f'   ✅ Saved! New record count: {report.record_count}'))
                    fixed_count += 1
                else:
                    self.stdout.write(self.style.WARNING('   ⚠️  DRY RUN - not saved'))
            else:
                if report_id:  # Only show for specific report queries
                    self.stdout.write(f'\n📋 Report: {report.title}')
                    self.stdout.write(self.style.SUCCESS('   ✅ Already has explicit scope - no changes needed'))
                    self.stdout.write(f'   Categories: {criteria.get("categories", [])}')
                    self.stdout.write(f'   Countries: {len(criteria.get("country", []))} countries')

        # Summary
        self.stdout.write('\n' + '='*60)
        if apply:
            self.stdout.write(self.style.SUCCESS(f'Fixed {fixed_count} report(s)'))
        else:
            self.stdout.write(self.style.WARNING(f'DRY RUN: {fixed_count} report(s) would be fixed'))
            self.stdout.write('Run with --apply to actually save changes')
