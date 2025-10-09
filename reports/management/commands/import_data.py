# reports/management/commands/import_data.py

import pandas as pd
import uuid
from django.db import models
from django.core.management.base import BaseCommand
from reports.models import SuperdatabaseRecord, CompanyCategory
import numpy as np

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
    help = 'Smartly imports and updates data from an Excel file using a unique factory_id.'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='The path to the Excel file.')
        parser.add_argument('sheet_name', type=str, help='The name of the sheet to import.')

    def handle(self, *args, **options):
        file_path = options['file_path']
        sheet_name = options['sheet_name']

        sheet_name_upper = sheet_name.upper()
        if sheet_name_upper not in SHEET_TO_CATEGORY_MAP:
            self.stdout.write(self.style.ERROR(f"Error: Sheet name '{sheet_name}' is not a valid category."))
            return
        category = SHEET_TO_CATEGORY_MAP[sheet_name_upper]

        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            self.stdout.write(self.style.SUCCESS(f"Successfully read {len(df)} rows from sheet '{sheet_name}'."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An error occurred reading the Excel file: {e}"))
            return

        df = df.replace({np.nan: None})

        factory_id_verbose_name = SuperdatabaseRecord._meta.get_field('factory_id').verbose_name
        company_name_verbose_name = SuperdatabaseRecord._meta.get_field('company_name').verbose_name
        country_verbose_name = SuperdatabaseRecord._meta.get_field('country').verbose_name
        address_1_verbose_name = SuperdatabaseRecord._meta.get_field('address_1').verbose_name

        existing_records_by_id = {str(rec.factory_id): rec for rec in
                                  SuperdatabaseRecord.objects.filter(category=category)}
        existing_records_by_natural_key = {(rec.company_name, rec.address_1, rec.country): rec for rec in
                                           SuperdatabaseRecord.objects.filter(category=category)}

        records_to_create = []
        records_to_update = []

        all_field_objects = {f.verbose_name: f for f in SuperdatabaseRecord._meta.get_fields() if
                             hasattr(f, 'verbose_name')}
        model_fields_map = {f.verbose_name: f.name for f in SuperdatabaseRecord._meta.get_fields() if
                            hasattr(f, 'verbose_name')}

        for index, row in df.iterrows():
            factory_id_from_excel = str(row[factory_id_verbose_name]) if factory_id_verbose_name in row and pd.notna(
                row[factory_id_verbose_name]) else None
            record_data = {}
            for excel_col_name, value in row.items():
                if excel_col_name in all_field_objects:
                    field_obj = all_field_objects[excel_col_name]
                    model_field_name = field_obj.name
                    if field_obj.get_internal_type() == 'BooleanField':
                        record_data[model_field_name] = bool(value) if value is not None else False
                    elif isinstance(field_obj,
                                    (models.CharField, models.TextField, models.EmailField, models.URLField)):
                        record_data[model_field_name] = str(value) if value is not None else ''
                    else:
                        record_data[model_field_name] = value

            if factory_id_from_excel and factory_id_from_excel in existing_records_by_id:
                record_instance = existing_records_by_id[factory_id_from_excel]
                for key, value in record_data.items():
                    if key != 'factory_id':
                        setattr(record_instance, key, value)
                records_to_update.append(record_instance)
            else:
                company_name = row.get(company_name_verbose_name)
                address_1 = row.get(address_1_verbose_name)
                country = row.get(country_verbose_name)

                if company_name and (company_name, address_1, country) in existing_records_by_natural_key:
                    self.stdout.write(self.style.WARNING(
                        f"Skipping creation of '{company_name}' to prevent a duplicate. "
                        f"This record already exists in the DB but has no factory_id in your Excel file. "
                        f"Please run the export command to get the latest master file."
                    ))
                    continue

                record_data['category'] = category
                record_data['factory_id'] = uuid.uuid4()
                records_to_create.append(SuperdatabaseRecord(**record_data))

        try:
            if records_to_create:
                SuperdatabaseRecord.objects.bulk_create(records_to_create, batch_size=1000)
                self.stdout.write(self.style.SUCCESS(f"Successfully created {len(records_to_create)} new records."))
            if records_to_update:
                self.stdout.write(self.style.WARNING(
                    f"Updating {len(records_to_update)} existing records... This may take a moment."))
                update_fields = [model_fields_map[col] for col in df.columns if
                                 col in model_fields_map and model_fields_map[col] != 'factory_id']
                SuperdatabaseRecord.objects.bulk_update(records_to_update, update_fields, batch_size=1000)
                self.stdout.write(self.style.SUCCESS("Done updating existing records."))
            self.stdout.write(self.style.SUCCESS("\nImport process complete."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An error occurred during database operations: {e}"))