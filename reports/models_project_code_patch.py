# =============================================================================
# PROJECT CODE IMPLEMENTATION - PATCH FILE
# =============================================================================
# 
# This file contains the code changes needed to implement project codes.
# Apply these changes to the respective files.
#
# Created: Project Code Feature Implementation
# =============================================================================

"""
================================================================================
STEP 1: UPDATE DataCollectionProject MODEL (in models.py)
================================================================================

Find the DataCollectionProject class (around line 1044) and add this field
after the project_id field:

"""

# Add this field to DataCollectionProject class, after project_id:
PROJECT_CODE_FIELD = '''
    project_code = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
        blank=True,  # Allow blank initially, will be set on save
        help_text="Auto-generated project code (e.g., PRJ-000001)"
    )
'''

# Add this method to the DataCollectionProject class:
PROJECT_CODE_METHODS = '''
    def save(self, *args, **kwargs):
        """Auto-generate project code on first save"""
        if not self.project_code:
            self.project_code = self._generate_project_code()
        super().save(*args, **kwargs)
    
    def _generate_project_code(self):
        """Generate unique project code like PRJ-000001"""
        from django.db import connection
        
        with connection.cursor() as cursor:
            # Get the max existing code
            cursor.execute("""
                SELECT project_code FROM reports_datacollectionproject 
                WHERE project_code LIKE 'PRJ-%%' 
                ORDER BY project_code DESC 
                LIMIT 1
            """)
            row = cursor.fetchone()
        
        if row and row[0]:
            try:
                last_num = int(row[0].split('-')[1])
                new_num = last_num + 1
            except (IndexError, ValueError):
                new_num = 1
        else:
            new_num = 1
        
        return f"PRJ-{str(new_num).zfill(6)}"
'''

"""
================================================================================
STEP 2: UPDATE ProductionSite MODEL (in company_models.py)
================================================================================

Find the ProductionSite class (around line 473) and add this field
after the category field:

"""

# Add this field to ProductionSite class, after category:
PRODUCTION_SITE_PROJECT_CODE_FIELD = '''
    # Source tracking - which project this production site came from
    source_project_code = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
        help_text="Project code from which this site was transferred (e.g., PRJ-000001)"
    )
    
    source_project = models.ForeignKey(
        'reports.DataCollectionProject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transferred_production_sites',
        help_text="Original project this site was transferred from"
    )
'''

"""
================================================================================
STEP 3: UPDATE transfer_to_company_database METHOD (in models.py)
================================================================================

Find the transfer_to_company_database method (around line 2195) and update it
to store the project code. Look for where ProductionSite is created.

Add these lines after creating/getting the production_site:

"""

# In transfer_to_company_database method, after getting/creating production_site,
# add these lines to store project code:
TRANSFER_PROJECT_CODE_UPDATE = '''
            # Store project code on Company and ProductionSite
            if self.project and self.project.project_code:
                # Update Company's project_code if this is the first transfer
                if not company.project_code:
                    company.project_code = self.project.project_code
                    company.source_project = self.project
                    company.save(update_fields=['project_code', 'source_project'])
                
                # Always store project code on ProductionSite (tracks per-category source)
                if not production_site.source_project_code:
                    production_site.source_project_code = self.project.project_code
                    production_site.source_project = self.project
                    production_site.save(update_fields=['source_project_code', 'source_project'])
'''
