# reports/management/commands/create_test_company.py
"""
Management command to create a test company with multiple production sites.

Usage:
    python manage.py create_test_company
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from reports.company_models import (
    Company, ProductionSite, ProductionSiteVersion, 
    CompanyStatus, CompanyHistory
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a test company with multiple production sites'

    def handle(self, *args, **options):
        # Get admin user
        admin = User.objects.filter(role='SUPERADMIN').first()
        if not admin:
            admin = User.objects.first()
        
        if not admin:
            self.stdout.write(self.style.ERROR('No users found. Please create a user first.'))
            return
        
        self.stdout.write(f'Using user: {admin.username}')
        
        # Create test company
        company = Company.objects.create(
            company_name="HMT Plastics",
            company_name_normalized="hmt plastics",
            address_1="161 Galijoen Road",
            address_2="Wadeville",
            address_4="Johannesburg",
            country="South Africa",
            phone_number="011 827 7250",
            company_email="gavin@hmtplastics.co.za",
            website="www.hmtplastics.co.za",
            status=CompanyStatus.COMPLETE,
            created_by=admin,
            last_modified_by=admin,
            title_1="Mr",
            initials_1="G",
            surname_1="Smith",
            position_1="MD",
            title_2="Mrs",
            initials_2="J",
            surname_2="Johnson",
            position_2="Sales Manager",
        )
        
        self.stdout.write(f'Created company: {company.unique_key} - {company.company_name}')
        
        # Add Injection Moulding process
        site1 = ProductionSite.objects.create(
            company=company,
            category='INJECTION',
            created_by=admin
        )
        
        ProductionSiteVersion.objects.create(
            production_site=site1,
            version_number=1,
            is_current=True,
            is_active=True,
            created_by=admin,
            version_notes='Initial data entry',
            # Materials
            hdpe=True,
            ldpe=True,
            pp=True,
            pa=True,
            abs=True,
            pc=True,
            pom=True,
            main_materials="PP, HDPE, PA6, PA66, ABS",
            # Markets
            automotive=True,
            automotive_interior=True,
            automotive_exterior=True,
            packaging=True,
            caps_closures=True,
            medical=True,
            medical_devices=True,
            houseware=True,
            electrical=True,
            main_applications="Automotive components, Medical devices, Packaging",
            # Services
            tool_design=True,
            tool_manufacture=True,
            clean_room=True,
            pad_printing=True,
            assembly=True,
            # Machinery
            minimal_lock_tonnes=50,
            maximum_lock_tonnes=1500,
            minimum_shot_grammes=5,
            maximum_shot_grammes=3500,
            number_of_machines=12,
            machinery_brand="Engel, Arburg, KraussMaffei",
        )
        
        self.stdout.write(self.style.SUCCESS(f'  + Added INJECTION process'))
        
        # Add Pipe Extrusion process
        site2 = ProductionSite.objects.create(
            company=company,
            category='PIPE',
            created_by=admin
        )
        
        ProductionSiteVersion.objects.create(
            production_site=site2,
            version_number=1,
            is_current=True,
            is_active=True,
            created_by=admin,
            version_notes='Initial data entry',
            # Materials
            hdpe=True,
            pvc=True,
            pp_r=True,
            pe100=True,
            main_materials="HDPE, PVC, PP-R, PE100",
            # Markets
            water_supply_distribution=True,
            drainage_sewerage=True,
            gas_transmission_distribution=True,
            irrigation=True,
            electrical_conduit=True,
            main_applications="Water supply, Drainage, Gas distribution",
            # Pipe sizes
            up_to_32_mm=True,
            between_33_63_mm=True,
            between_64_90_mm=True,
            between_110_160_mm=True,
            between_161_250_mm=True,
            # Technology
            solid_wall=True,
            multilayer_polymeric=True,
            number_of_machines=6,
        )
        
        self.stdout.write(self.style.SUCCESS(f'  + Added PIPE process'))
        
        # Add history entry
        CompanyHistory.objects.create(
            company=company,
            action='CREATED',
            performed_by=admin,
            description='Test company created via management command'
        )
        
        # Create second test company (Blow Moulder)
        company2 = Company.objects.create(
            company_name="ABC Containers Ltd",
            company_name_normalized="abc containers ltd",
            address_1="45 Industrial Park",
            address_2="Manchester",
            country="United Kingdom",
            phone_number="+44 161 123 4567",
            company_email="info@abccontainers.co.uk",
            status=CompanyStatus.COMPLETE,
            created_by=admin,
            last_modified_by=admin,
            title_1="Mr",
            initials_1="R",
            surname_1="Williams",
            position_1="Technical Director",
        )
        
        self.stdout.write(f'Created company: {company2.unique_key} - {company2.company_name}')
        
        # Add Blow Moulding process
        site3 = ProductionSite.objects.create(
            company=company2,
            category='BLOW',
            created_by=admin
        )
        
        ProductionSiteVersion.objects.create(
            production_site=site3,
            version_number=1,
            is_current=True,
            is_active=True,
            created_by=admin,
            version_notes='Initial data entry',
            # Materials
            hdpe=True,
            pet=True,
            pp=True,
            main_materials="HDPE, PET, PP",
            # Container sizes
            under_1_litre=True,
            from_1_to_5_litres=True,
            from_5_to_25_litres=True,
            multilayer=True,
            # Markets
            food_drink=True,
            household_chemicals=True,
            cosmetics_packaging=True,
            industrial_chemicals=True,
            main_applications="Food & beverage bottles, Household chemical containers",
            # Services
            tool_design=True,
            labelling=True,
            filling=True,
            # Machines
            extrusion_blow_moulding_machines=8,
            injection_stretch_blow_moulding_stage_2_machines=4,
            buy_in_preform=True,
            buy_in_preform_percentage=60,
            number_of_machines=12,
        )
        
        self.stdout.write(self.style.SUCCESS(f'  + Added BLOW process'))
        
        CompanyHistory.objects.create(
            company=company2,
            action='CREATED',
            performed_by=admin,
            description='Test company created via management command'
        )
        
        # Create third test company (Incomplete status)
        company3 = Company.objects.create(
            company_name="XYZ Extrusions GmbH",
            company_name_normalized="xyz extrusions gmbh",
            address_1="Industriestraße 123",
            address_2="Stuttgart",
            country="Germany",
            phone_number="+49 711 987654",
            status=CompanyStatus.INCOMPLETE,
            created_by=admin,
            last_modified_by=admin,
        )
        
        self.stdout.write(f'Created company: {company3.unique_key} - {company3.company_name}')
        
        # Add Sheet Extrusion process
        site4 = ProductionSite.objects.create(
            company=company3,
            category='SHEET',
            created_by=admin
        )
        
        ProductionSiteVersion.objects.create(
            production_site=site4,
            version_number=1,
            is_current=True,
            is_active=True,
            created_by=admin,
            version_notes='Initial data - needs verification',
            hdpe=True,
            pp=True,
            pet=True,
            packaging=True,
            main_applications="Thermoforming sheet for packaging",
        )
        
        self.stdout.write(self.style.SUCCESS(f'  + Added SHEET process'))
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Test data created successfully!'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(f'Companies created: {Company.objects.count()}')
        self.stdout.write(f'Production sites created: {ProductionSite.objects.count()}')
        self.stdout.write(f'Versions created: {ProductionSiteVersion.objects.count()}')
        self.stdout.write('')
        self.stdout.write('You can now view the data at:')
        self.stdout.write('  http://localhost:8000/company-database')
        self.stdout.write(f'  http://localhost:8000/company-database/{company.id}')
