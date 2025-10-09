# reports/management/commands/export_data.py

import pandas as pd
from django.core.management.base import BaseCommand
from django.db import models
from reports.models import SuperdatabaseRecord, CompanyCategory
from reports.fields import (
    COMMON_FIELDS, CONTACT_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
    PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS,
    CABLE_FIELDS, COMPOUNDER_FIELDS
)


class Command(BaseCommand):
    help = 'Exports category-specific data from SuperdatabaseRecord to an Excel file.'

    def add_arguments(self, parser):
        parser.add_argument('category_name', type=str, help='The category to export (e.g., "INJECTION MOULDERS").')

    def handle(self, *args, **options):
        category_name_input = options['category_name'].upper()

        category_map = {
            'INJECTION MOULDERS': (CompanyCategory.INJECTION, INJECTION_FIELDS),
            'BLOW MOULDERS': (CompanyCategory.BLOW, BLOW_FIELDS),
            'ROTO MOULDERS': (CompanyCategory.ROTO, ROTO_FIELDS),
            'PE FILM EXTRUDERS': (CompanyCategory.PE_FILM, PE_FILM_FIELDS),
            'SHEET EXTRUDERS': (CompanyCategory.SHEET, SHEET_FIELDS),
            'PIPE EXTRUDERS': (CompanyCategory.PIPE, PIPE_FIELDS),
            'TUBE & HOSE EXTRUDERS': (CompanyCategory.TUBE_HOSE, TUBE_HOSE_FIELDS),
            'PROFILE EXTRUDERS': (CompanyCategory.PROFILE, PROFILE_FIELDS),
            'CABLE EXTRUDERS': (CompanyCategory.CABLE, CABLE_FIELDS),
            'COMPOUNDERS': (CompanyCategory.COMPOUNDER, COMPOUNDER_FIELDS),
        }

        if category_name_input not in category_map:
            self.stdout.write(self.style.ERROR(f"Error: Category '{options['category_name']}' not found."))
            valid_keys = '", "'.join(category_map.keys())
            self.stdout.write(self.style.WARNING(f'Valid categories are: "{valid_keys}"'))
            return

        category_value, category_fields = category_map[category_name_input]
        self.stdout.write(f"Starting export for category: {category_name_input}...")

        try:
            queryset = SuperdatabaseRecord.objects.filter(category=category_value)

            verbose_name_map = {f.name: f.verbose_name for f in SuperdatabaseRecord._meta.get_fields() if
                                hasattr(f, 'verbose_name')}

            export_field_names = ['factory_id'] + COMMON_FIELDS + CONTACT_FIELDS + category_fields

            data = list(queryset.values(*export_field_names))

            if not data:
                self.stdout.write(self.style.WARNING("No data found for this category."))
                return

            df = pd.DataFrame(data)

            boolean_field_names = [f.name for f in SuperdatabaseRecord._meta.get_fields() if
                                   isinstance(f, models.BooleanField)]
            for field_name in boolean_field_names:
                if field_name in df.columns:
                    df[field_name] = df[field_name].astype(int)

            df.rename(columns=verbose_name_map, inplace=True)

            output_filename = f"export_{category_name_input.replace(' ', '_')}.xlsx"
            df.to_excel(output_filename, index=False)

            self.stdout.write(self.style.SUCCESS(f"Successfully exported {len(df)} records to '{output_filename}'."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An error occurred during export: {e}"))