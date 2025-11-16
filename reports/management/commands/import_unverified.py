# reports/management/commands/import_unverified.py

"""
Django management command to import unverified company data from Excel files.

Usage:
    python manage.py import_unverified path/to/file.xlsx "SHEET NAME"

Example:
    python manage.py import_unverified data.xlsx "BLOW MOULDERS"
    
Features:
- Imports data to UnverifiedSite (not SuperdatabaseRecord)
- Auto-calculates data quality score
- Auto-detects duplicates
- Sets source as PHONE_CALL by default
- Tracks who ran the import (collected_by)
"""

import pandas as pd
import numpy as np
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from reports.models import UnverifiedSite, CompanyCategory, DataSource, VerificationStatus, PriorityLevel
from reports.email_notifications import send_site_submitted_notification

User = get_user_model()

# Map Excel sheet names to categories
SHEET_TO_CATEGORY_MAP = {
    'INJECTION MOULDERS': CompanyCategory.INJECTION,
    'BLOW MOULDERS': CompanyCategory.BLOW,
    'ROTO MOULDERS': CompanyCategory.ROTO,
    'PE FILM EXTRUDERS': CompanyCategory.PE_FILM,
    'SHEET EXTRUDERS': CompanyCategory.SHEET,
    'PIPE EXTRUDERS': CompanyCategory.PIPE,
    'TUBE & HOSE EXTRUDERS': CompanyCategory.TUBE_HOSE,
    'PROFILE EXTRUDERS': CompanyCategory.PROFILE,
    'CABLE EXTRUDERS': CompanyCategory.CABLE,
    'COMPOUNDERS': CompanyCategory.COMPOUNDER,
}


class Command(BaseCommand):
    help = 'Import unverified company data from Excel file into UnverifiedSite model'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the Excel file')
        parser.add_argument('sheet_name', type=str, help='Name of the sheet to import')
        parser.add_argument(
            '--user',
            type=str,
            default=None,
            help='Username of the person collecting this data (optional)'
        )
        parser.add_argument(
            '--source',
            type=str,
            default='PHONE_CALL',
            choices=['PHONE_CALL', 'EMAIL', 'WEB_RESEARCH', 'TRADE_SHOW', 'REFERRAL', 'OTHER'],
            help='Data source (default: PHONE_CALL)'
        )
        parser.add_argument(
            '--priority',
            type=str,
            default='MEDIUM',
            choices=['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            help='Priority level (default: MEDIUM)'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        sheet_name = options['sheet_name']
        username = options.get('user')
        source = options.get('source', 'PHONE_CALL')
        priority = options.get('priority', 'MEDIUM')

        # Validate sheet name and get category
        sheet_name_upper = sheet_name.upper()
        if sheet_name_upper not in SHEET_TO_CATEGORY_MAP:
            self.stdout.write(self.style.ERROR(
                f"❌ Error: Sheet name '{sheet_name}' is not a valid category."
            ))
            self.stdout.write("Valid categories:")
            for cat in SHEET_TO_CATEGORY_MAP.keys():
                self.stdout.write(f"  - {cat}")
            return

        category = SHEET_TO_CATEGORY_MAP[sheet_name_upper]

        # Get user if username provided
        collected_by = None
        if username:
            try:
                collected_by = User.objects.get(username=username)
                self.stdout.write(self.style.SUCCESS(f"✅ Collected by: {collected_by.username}"))
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"⚠️  Warning: User '{username}' not found. Import will proceed without collector info."
                ))

        # Read Excel file
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            self.stdout.write(self.style.SUCCESS(
                f"✅ Successfully read {len(df)} rows from sheet '{sheet_name}'"
            ))
        except FileNotFoundError:
            raise CommandError(f"❌ File not found: {file_path}")
        except Exception as e:
            raise CommandError(f"❌ Error reading Excel file: {e}")

        # Replace NaN with None
        df = df.replace({np.nan: None})

        # Get field mappings from model
        all_field_objects = {
            f.verbose_name: f for f in UnverifiedSite._meta.get_fields() 
            if hasattr(f, 'verbose_name')
        }
        model_fields_map = {
            f.verbose_name: f.name for f in UnverifiedSite._meta.get_fields() 
            if hasattr(f, 'verbose_name')
        }

        # Track statistics
        created_count = 0
        skipped_count = 0
        duplicate_count = 0
        error_count = 0

        # Process each row
        self.stdout.write("\n🔄 Processing records...")
        
        for index, row in df.iterrows():
            try:
                record_data = {}
                
                # Map Excel columns to model fields
                for excel_col_name, value in row.items():
                    if excel_col_name in all_field_objects:
                        field_obj = all_field_objects[excel_col_name]
                        model_field_name = field_obj.name
                        
                        # Handle different field types
                        field_type = field_obj.get_internal_type()
                        
                        if field_type == 'BooleanField':
                            record_data[model_field_name] = bool(value) if value is not None else False
                        elif field_type in ['CharField', 'TextField']:
                            record_data[model_field_name] = str(value) if value is not None else ''
                        else:
                            record_data[model_field_name] = value

                # Set category and verification fields
                record_data['category'] = category
                record_data['verification_status'] = VerificationStatus.PENDING
                record_data['source'] = source
                record_data['priority'] = priority
                record_data['collected_by'] = collected_by

                # Check if this is a duplicate (by company name + country)
                company_name = record_data.get('company_name')
                country = record_data.get('country')
                
                if not company_name:
                    self.stdout.write(self.style.WARNING(
                        f"⚠️  Row {index + 2}: Skipping - no company name"
                    ))
                    skipped_count += 1
                    continue

                # Check for existing unverified site with same name/country
                existing = UnverifiedSite.objects.filter(
                    company_name__iexact=company_name,
                    country__iexact=country if country else '',
                    category=category
                ).first()

                if existing:
                    self.stdout.write(self.style.WARNING(
                        f"⚠️  Row {index + 2}: Duplicate - '{company_name}' already in unverified sites"
                    ))
                    duplicate_count += 1
                    continue

                # Create UnverifiedSite record
                site = UnverifiedSite(**record_data)
                site.save()  # save() will auto-calculate quality score and check duplicates
                
                send_site_submitted_notification(site)

                created_count += 1
                
                # Show progress every 10 records
                if created_count % 10 == 0:
                    self.stdout.write(f"  ✅ Processed {created_count} records...")

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"❌ Row {index + 2}: Error - {str(e)}"
                ))
                error_count += 1
                continue

        # Final summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("📊 IMPORT SUMMARY"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"📁 File: {file_path}")
        self.stdout.write(f"📋 Sheet: {sheet_name}")
        self.stdout.write(f"🏷️  Category: {category}")
        self.stdout.write(f"📦 Source: {source}")
        self.stdout.write(f"⚡ Priority: {priority}")
        if collected_by:
            self.stdout.write(f"👤 Collected by: {collected_by.username}")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Created: {created_count} records"))
        if duplicate_count > 0:
            self.stdout.write(self.style.WARNING(f"⚠️  Duplicates skipped: {duplicate_count}"))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f"⚠️  Skipped (no name): {skipped_count}"))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"❌ Errors: {error_count}"))
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"✅ Import complete! Check Django admin to review unverified sites."
        ))
        self.stdout.write("=" * 70)