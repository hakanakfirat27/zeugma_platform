# reports/management/commands/check_import_fields.py

"""
Diagnostic command to check which Excel columns will be imported.
This helps identify mismatches between Excel headers and model field names.

Usage:
    python manage.py check_import_fields path/to/file.xlsx "SHEET NAME"
"""

import pandas as pd
import numpy as np
from django.core.management.base import BaseCommand, CommandError
from reports.models import UnverifiedSite, SuperdatabaseRecord

class Command(BaseCommand):
    help = 'Check which Excel columns match UnverifiedSite model fields'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the Excel file')
        parser.add_argument('sheet_name', type=str, help='Name of the sheet to check')

    def handle(self, *args, **options):
        file_path = options['file_path']
        sheet_name = options['sheet_name']

        # Read Excel file
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            self.stdout.write(self.style.SUCCESS(
                f"✅ Successfully read Excel file with {len(df)} rows"
            ))
        except FileNotFoundError:
            raise CommandError(f"❌ File not found: {file_path}")
        except Exception as e:
            raise CommandError(f"❌ Error reading Excel file: {e}")

        # Get UnverifiedSite field mappings
        unverified_fields = {
            f.verbose_name: f.name 
            for f in UnverifiedSite._meta.get_fields() 
            if hasattr(f, 'verbose_name')
        }
        
        # Get SuperdatabaseRecord field mappings for comparison
        superdatabase_fields = {
            f.verbose_name: f.name 
            for f in SuperdatabaseRecord._meta.get_fields() 
            if hasattr(f, 'verbose_name')
        }

        # Get Excel columns
        excel_columns = list(df.columns)

        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("📊 FIELD MAPPING ANALYSIS"))
        self.stdout.write("=" * 80)

        # 1. Excel columns that WILL be imported (match UnverifiedSite)
        self.stdout.write("\n✅ EXCEL COLUMNS THAT WILL BE IMPORTED:")
        self.stdout.write("-" * 80)
        matched_columns = []
        for col in excel_columns:
            if col in unverified_fields:
                matched_columns.append(col)
                self.stdout.write(f"  ✓ '{col}' → {unverified_fields[col]}")
        
        if not matched_columns:
            self.stdout.write("  ⚠️  NO MATCHES FOUND!")

        # 2. Excel columns that WON'T be imported (don't match)
        self.stdout.write("\n❌ EXCEL COLUMNS THAT WON'T BE IMPORTED:")
        self.stdout.write("-" * 80)
        unmatched_columns = []
        for col in excel_columns:
            if col not in unverified_fields:
                unmatched_columns.append(col)
                # Check if it exists in Superdatabase
                if col in superdatabase_fields:
                    self.stdout.write(f"  ✗ '{col}' (exists in Superdatabase but not in UnverifiedSite!)")
                else:
                    self.stdout.write(f"  ✗ '{col}' (not in either model)")
        
        if not unmatched_columns:
            self.stdout.write("  ✓ All Excel columns will be imported!")

        # 3. UnverifiedSite fields that exist but aren't in Excel
        self.stdout.write("\n📋 UNVERIFIEDSITE FIELDS NOT IN YOUR EXCEL:")
        self.stdout.write("-" * 80)
        missing_fields = []
        for verbose_name, field_name in unverified_fields.items():
            if verbose_name not in excel_columns:
                missing_fields.append(verbose_name)
                self.stdout.write(f"  • {verbose_name} ({field_name})")

        # 4. Fields in Superdatabase but missing from UnverifiedSite
        self.stdout.write("\n⚠️  FIELDS IN SUPERDATABASE BUT MISSING FROM UNVERIFIEDSITE:")
        self.stdout.write("-" * 80)
        missing_from_unverified = []
        for verbose_name in superdatabase_fields.keys():
            if verbose_name not in unverified_fields:
                missing_from_unverified.append(verbose_name)
                self.stdout.write(f"  ! {verbose_name}")
        
        if not missing_from_unverified:
            self.stdout.write("  ✓ UnverifiedSite has all Superdatabase fields!")

        # Summary
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write(self.style.SUCCESS("📈 SUMMARY"))
        self.stdout.write("=" * 80)
        self.stdout.write(f"Excel columns: {len(excel_columns)}")
        self.stdout.write(f"  - Will be imported: {len(matched_columns)}")
        self.stdout.write(f"  - Will be skipped: {len(unmatched_columns)}")
        self.stdout.write(f"\nUnverifiedSite total fields: {len(unverified_fields)}")
        self.stdout.write(f"SuperdatabaseRecord total fields: {len(superdatabase_fields)}")
        self.stdout.write(f"Missing from UnverifiedSite: {len(missing_from_unverified)}")
        
        if missing_from_unverified:
            self.stdout.write("\n" + self.style.WARNING(
                "⚠️  WARNING: UnverifiedSite is missing fields that exist in Superdatabase!"
            ))
            self.stdout.write(self.style.WARNING(
                "   This means data will be lost when transferring verified sites."
            ))
            self.stdout.write(self.style.WARNING(
                "   Consider adding these fields to the UnverifiedSite model."
            ))
        
        self.stdout.write("=" * 80)