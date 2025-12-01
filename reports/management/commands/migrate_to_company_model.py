# reports/management/commands/migrate_to_company_model.py
"""
Data Migration Command: SuperdatabaseRecord -> Company-Centric Model

This command migrates existing data from the old SuperdatabaseRecord model
to the new Company-centric model structure.

IMPORTANT: Run this AFTER creating the new model migrations!

Usage:
    python manage.py migrate_to_company_model --dry-run    # Preview changes
    python manage.py migrate_to_company_model              # Execute migration
    python manage.py migrate_to_company_model --batch=500  # Custom batch size

What it does:
1. Groups existing records by company name + country
2. Creates a single Company record for each unique company
3. Creates ProductionSite records for each category
4. Creates ProductionSiteVersion records with the actual data
5. Maintains references to original factory_ids for rollback
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from collections import defaultdict
import sys


class Command(BaseCommand):
    help = 'Migrate SuperdatabaseRecord data to new Company-centric model'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview migration without making changes',
        )
        parser.add_argument(
            '--batch',
            type=int,
            default=100,
            help='Batch size for processing (default: 100)',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip companies that already exist in new model',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch']
        skip_existing = options['skip_existing']
        verbose = options['verbose']
        
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.SUCCESS("ZEUGMA DATABASE MIGRATION"))
        self.stdout.write(self.style.SUCCESS("SuperdatabaseRecord → Company-Centric Model"))
        self.stdout.write("=" * 80)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n🔍 DRY RUN MODE - No changes will be made\n"))
        
        # Import models
        try:
            from reports.models import SuperdatabaseRecord
            from reports.company_models import (
                Company, ProductionSite, ProductionSiteVersion, 
                CompanyStatus, CompanyHistory
            )
        except ImportError as e:
            raise CommandError(f"Failed to import models: {e}")
        
        # Get all existing records
        self.stdout.write("\n📊 Analyzing existing data...")
        
        total_records = SuperdatabaseRecord.objects.count()
        self.stdout.write(f"   Total SuperdatabaseRecord entries: {total_records}")
        
        if total_records == 0:
            self.stdout.write(self.style.WARNING("   No records to migrate!"))
            return
        
        # Group records by normalized company name + country
        self.stdout.write("\n🔄 Grouping records by company...")
        
        companies_dict = defaultdict(list)
        
        for record in SuperdatabaseRecord.objects.all().iterator():
            # Create grouping key
            normalized_name = record.company_name.lower().strip()
            country = (record.country or '').lower().strip()
            key = (normalized_name, country)
            companies_dict[key].append(record)
        
        unique_companies = len(companies_dict)
        self.stdout.write(f"   Unique companies identified: {unique_companies}")
        
        # Show companies with multiple categories
        multi_category = sum(1 for records in companies_dict.values() if len(records) > 1)
        self.stdout.write(f"   Companies with multiple categories: {multi_category}")
        
        if verbose:
            self.stdout.write("\n   Sample multi-category companies:")
            count = 0
            for (name, country), records in companies_dict.items():
                if len(records) > 1:
                    categories = [r.category for r in records]
                    self.stdout.write(f"      - {records[0].company_name} ({country}): {', '.join(categories)}")
                    count += 1
                    if count >= 5:
                        break
        
        # Check for existing companies
        existing_count = Company.objects.count()
        if existing_count > 0:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️  {existing_count} companies already exist in new model"
            ))
            if skip_existing:
                self.stdout.write("   Will skip existing companies")
            else:
                self.stdout.write("   Will update existing companies with new data")
        
        if dry_run:
            self._show_dry_run_summary(companies_dict)
            return
        
        # Confirm before proceeding
        self.stdout.write("\n" + "=" * 80)
        confirm = input(f"Proceed with migration of {unique_companies} companies? [y/N]: ")
        if confirm.lower() != 'y':
            self.stdout.write(self.style.WARNING("Migration cancelled."))
            return
        
        # Execute migration
        self.stdout.write("\n🚀 Starting migration...")
        
        stats = {
            'companies_created': 0,
            'companies_updated': 0,
            'production_sites_created': 0,
            'versions_created': 0,
            'errors': []
        }
        
        # Define fields to copy from SuperdatabaseRecord
        core_fields = [
            'address_1', 'address_2', 'address_3', 'address_4',
            'region', 'geographical_coverage', 'phone_number',
            'company_email', 'website', 'accreditation', 'parent_company',
            'title_1', 'initials_1', 'surname_1', 'position_1',
            'title_2', 'initials_2', 'surname_2', 'position_2',
            'title_3', 'initials_3', 'surname_3', 'position_3',
            'title_4', 'initials_4', 'surname_4', 'position_4',
        ]
        
        # Fields to exclude from version data (they're in Company or metadata)
        exclude_from_version = {
            'id', 'factory_id', 'category', 'company_name',
            'address_1', 'address_2', 'address_3', 'address_4',
            'region', 'country', 'geographical_coverage', 'phone_number',
            'company_email', 'website', 'accreditation', 'parent_company',
            'title_1', 'initials_1', 'surname_1', 'position_1',
            'title_2', 'initials_2', 'surname_2', 'position_2',
            'title_3', 'initials_3', 'surname_3', 'position_3',
            'title_4', 'initials_4', 'surname_4', 'position_4',
            'date_added', 'last_updated'
        }
        
        # Get version field names
        version_fields = []
        for field in ProductionSiteVersion._meta.fields:
            if field.name not in ['version_id', 'production_site', 'version_number',
                                   'is_current', 'is_active', 'version_notes',
                                   'verified_at', 'verified_by', 'created_at', 'created_by']:
                version_fields.append(field.name)
        
        processed = 0
        
        for (normalized_name, country), records in companies_dict.items():
            try:
                with transaction.atomic():
                    # Use the first record as the source for core info
                    first_record = records[0]
                    
                    # Check if company exists
                    existing_company = Company.objects.filter(
                        company_name_normalized=normalized_name,
                        country__iexact=country if country else ''
                    ).first()
                    
                    if existing_company and skip_existing:
                        continue
                    
                    if existing_company:
                        company = existing_company
                        stats['companies_updated'] += 1
                    else:
                        # Create Company
                        company_data = {
                            'company_name': first_record.company_name,
                            'country': first_record.country or '',
                            'status': CompanyStatus.COMPLETE,  # Verified data
                        }
                        
                        # Copy core fields
                        for field in core_fields:
                            value = getattr(first_record, field, '')
                            if value:
                                company_data[field] = value
                        
                        # Track legacy IDs
                        company_data['legacy_factory_ids'] = [
                            str(r.factory_id) for r in records
                        ]
                        
                        company = Company.objects.create(**company_data)
                        stats['companies_created'] += 1
                    
                    # Create ProductionSite and Version for each category
                    for record in records:
                        # Check if production site exists
                        site, site_created = ProductionSite.objects.get_or_create(
                            company=company,
                            category=record.category
                        )
                        
                        if site_created:
                            stats['production_sites_created'] += 1
                        
                        # Build version data
                        version_data = {}
                        for field_name in version_fields:
                            if hasattr(record, field_name):
                                value = getattr(record, field_name)
                                version_data[field_name] = value
                        
                        # Create version
                        version_number = site.versions.count() + 1
                        
                        ProductionSiteVersion.objects.create(
                            production_site=site,
                            version_number=version_number,
                            is_current=True,
                            is_active=True,
                            version_notes=f"Migrated from SuperdatabaseRecord (factory_id: {record.factory_id})",
                            verified_at=record.last_updated,
                            **version_data
                        )
                        stats['versions_created'] += 1
                    
                    # Create history entry
                    CompanyHistory.objects.create(
                        company=company,
                        action='CREATED' if not existing_company else 'UPDATED',
                        description=f"Migrated from SuperdatabaseRecord. Original records: {len(records)}",
                        changes={'migrated_factory_ids': [str(r.factory_id) for r in records]}
                    )
                
                processed += 1
                
                if processed % batch_size == 0:
                    self.stdout.write(f"   Processed {processed}/{unique_companies} companies...")
            
            except Exception as e:
                stats['errors'].append({
                    'company': first_record.company_name,
                    'error': str(e)
                })
                if verbose:
                    self.stdout.write(self.style.ERROR(
                        f"   Error processing {first_record.company_name}: {e}"
                    ))
        
        # Final summary
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("✅ MIGRATION COMPLETED"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"\n📊 Results:")
        self.stdout.write(f"   Companies created: {stats['companies_created']}")
        self.stdout.write(f"   Companies updated: {stats['companies_updated']}")
        self.stdout.write(f"   Production sites created: {stats['production_sites_created']}")
        self.stdout.write(f"   Versions created: {stats['versions_created']}")
        
        if stats['errors']:
            self.stdout.write(self.style.ERROR(f"\n   Errors: {len(stats['errors'])}"))
            for error in stats['errors'][:10]:
                self.stdout.write(f"      - {error['company']}: {error['error']}")
            if len(stats['errors']) > 10:
                self.stdout.write(f"      ... and {len(stats['errors']) - 10} more")
        
        self.stdout.write("\n" + self.style.SUCCESS("Migration complete!"))
    
    def _show_dry_run_summary(self, companies_dict):
        """Show what would be created in a dry run"""
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("📋 DRY RUN SUMMARY - What would be created:")
        self.stdout.write("=" * 80)
        
        total_companies = len(companies_dict)
        total_sites = sum(len(records) for records in companies_dict.values())
        
        # Category breakdown
        category_counts = defaultdict(int)
        for records in companies_dict.values():
            for record in records:
                category_counts[record.category] += 1
        
        self.stdout.write(f"\n   Companies to create: {total_companies}")
        self.stdout.write(f"   Production sites to create: {total_sites}")
        self.stdout.write(f"   Versions to create: {total_sites}")
        
        self.stdout.write("\n   Category breakdown:")
        for category, count in sorted(category_counts.items(), key=lambda x: -x[1]):
            self.stdout.write(f"      {category}: {count}")
        
        self.stdout.write("\n" + self.style.SUCCESS("Run without --dry-run to execute migration"))