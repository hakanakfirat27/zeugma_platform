# reports/company_models.py
"""
New Company-Centric Database Models for Zeugma Platform

This module contains the new database structure that:
1. Treats Company as the central entity
2. Separates production sites by category
3. Implements version history for all changes
4. Supports status-based filtering (Complete, Incomplete, Deleted)
5. Includes duplicate detection
6. Prepares for CRM integration

MIGRATION NOTE: These models work alongside existing SuperdatabaseRecord 
until migration is complete.
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from difflib import SequenceMatcher
from django.db.models import Q

User = get_user_model()


# =============================================================================
# STATUS CHOICES
# =============================================================================

class CompanyStatus(models.TextChoices):
    """Status choices for companies in the Superdatabase"""
    COMPLETE = 'COMPLETE', 'Complete Site (Verified by telephone interview)'
    INCOMPLETE = 'INCOMPLETE', 'Incomplete Site (Unverified, estimated data)'
    DELETED = 'DELETED', 'Deleted Site (No data, kept for future reference)'


# =============================================================================
# COMPANY MODEL (Master Record)
# =============================================================================

class Company(models.Model):
    """
    Master company record - the single source of truth for each company.
    
    This is the central entity that links:
    - Multiple production sites (one per category)
    - Multiple versions per production site
    - Notes and comments
    - CRM data (future)
    
    Key Features:
    - Unique human-readable key (ZGM-00001)
    - Normalized name for duplicate detection
    - Status filtering (Complete/Incomplete/Deleted)
    - Full audit trail
    """
    
    # ==========================================================================
    # PRIMARY IDENTIFICATION
    # ==========================================================================
    
    company_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text="System-generated unique identifier"
    )
    
    unique_key = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
        help_text="Human-readable unique key (e.g., ZGM-00001)"
    )
    
    # ==========================================================================
    # CORE COMPANY INFORMATION (Always Displayed)
    # ==========================================================================
    
    company_name = models.CharField(
        "Company Name",
        max_length=255,
        db_index=True
    )
    
    company_name_normalized = models.CharField(
        max_length=255,
        editable=False,
        db_index=True,
        help_text="Lowercase, trimmed version for duplicate detection"
    )
    
    # Address Information
    address_1 = models.CharField("Address 1", max_length=255, blank=True)
    address_2 = models.CharField("Address 2", max_length=255, blank=True)
    address_3 = models.CharField("Address 3", max_length=255, blank=True)
    address_4 = models.CharField("Address 4", max_length=255, blank=True)
    region = models.CharField("Region", max_length=100, blank=True)
    country = models.CharField("Country", max_length=100, blank=True, db_index=True)
    geographical_coverage = models.CharField("Geographical Coverage", max_length=255, blank=True)
    
    # Contact Information
    phone_number = models.CharField("Phone Number", max_length=50, blank=True)
    company_email = models.EmailField("Company Email", max_length=255, blank=True)
    website = models.URLField("Website", max_length=255, blank=True)
    accreditation = models.TextField("Accreditation", blank=True)
    parent_company = models.CharField("Parent Company", max_length=255, blank=True)
    
    # ==========================================================================
    # CONTACT PERSONS (Up to 4)
    # ==========================================================================
    
    title_1 = models.CharField("Title 1", max_length=50, blank=True)
    initials_1 = models.CharField("Initials 1", max_length=10, blank=True)
    surname_1 = models.CharField("Surname 1", max_length=100, blank=True)
    position_1 = models.CharField("Position 1", max_length=100, blank=True)
    
    title_2 = models.CharField("Title 2", max_length=50, blank=True)
    initials_2 = models.CharField("Initials 2", max_length=10, blank=True)
    surname_2 = models.CharField("Surname 2", max_length=100, blank=True)
    position_2 = models.CharField("Position 2", max_length=100, blank=True)
    
    title_3 = models.CharField("Title 3", max_length=50, blank=True)
    initials_3 = models.CharField("Initials 3", max_length=10, blank=True)
    surname_3 = models.CharField("Surname 3", max_length=100, blank=True)
    position_3 = models.CharField("Position 3", max_length=100, blank=True)
    
    title_4 = models.CharField("Title 4", max_length=50, blank=True)
    initials_4 = models.CharField("Initials 4", max_length=10, blank=True)
    surname_4 = models.CharField("Surname 4", max_length=100, blank=True)
    position_4 = models.CharField("Position 4", max_length=100, blank=True)
    
    # ==========================================================================
    # STATUS & SOURCE TRACKING
    # ==========================================================================
    
    status = models.CharField(
        max_length=20,
        choices=CompanyStatus.choices,
        default=CompanyStatus.INCOMPLETE,
        db_index=True,
        help_text="Current status of the company record"
    )
    
    project_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Project code if data was collected via a project"
    )
    
    source_project = models.ForeignKey(
        'reports.DataCollectionProject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies',
        help_text="Original project this company came from"
    )
    
    # Legacy reference (for migration tracking)
    legacy_factory_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="List of old factory_ids from SuperdatabaseRecord (for migration)"
    )
    
    # ==========================================================================
    # AUDIT FIELDS
    # ==========================================================================
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_companies'
    )
    
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='modified_companies'
    )
    
    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ['company_name']
        indexes = [
            models.Index(fields=['company_name_normalized']),
            models.Index(fields=['country', 'status']),
            models.Index(fields=['unique_key']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.unique_key} - {self.company_name}"
    
    def save(self, *args, **kwargs):
        # Normalize company name for duplicate detection
        self.company_name_normalized = self.company_name.lower().strip()
        
        # Generate unique key if not exists
        if not self.unique_key:
            self.unique_key = self._generate_unique_key()
        
        super().save(*args, **kwargs)
    
    def _generate_unique_key(self):
        """Generate unique key like ZGM-00001"""
        # Use a lock-safe approach
        from django.db import connection
        
        with connection.cursor() as cursor:
            # Get the max existing key
            cursor.execute("""
                SELECT unique_key FROM reports_company 
                WHERE unique_key LIKE 'ZGM-%%' 
                ORDER BY unique_key DESC 
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
        
        return f"ZGM-{str(new_num).zfill(5)}"
    
    # ==========================================================================
    # PROPERTIES & METHODS
    # ==========================================================================
    
    @property
    def active_production_sites(self):
        """Get all active production sites for this company"""
        return self.production_sites.filter(
            versions__is_active=True,
            versions__is_current=True
        ).distinct()
    
    @property
    def all_categories(self):
        """Get list of all categories this company operates in"""
        return list(self.production_sites.values_list('category', flat=True).distinct())
    
    @property
    def active_categories(self):
        """Get list of categories with active production"""
        return list(
            self.production_sites.filter(
                versions__is_active=True,
                versions__is_current=True
            ).values_list('category', flat=True).distinct()
        )
    
    def get_production_site(self, category):
        """Get production site for a specific category"""
        return self.production_sites.filter(category=category).first()
    
    def get_current_version(self, category):
        """Get current version for a specific category"""
        site = self.get_production_site(category)
        if site:
            return site.versions.filter(is_current=True).first()
        return None
    
    def add_production_site(self, category, created_by, version_data=None):
        """
        Add a new production site (category) to this company.
        Creates Initial Version (version_number=0, is_initial=True) as the baseline.
        
        Args:
            category: The category code (e.g., 'INJECTION')
            created_by: User who is adding this
            version_data: Dict of category-specific field values
            
        Returns:
            tuple: (ProductionSite, ProductionSiteVersion)
        """
        # Check if site already exists
        existing = self.production_sites.filter(category=category).first()
        if existing:
            raise ValueError(f"Company already has a {category} production site")
        
        # Create production site
        site = ProductionSite.objects.create(
            company=self,
            category=category,
            created_by=created_by
        )
        
        # Clean version_data - convert empty strings to appropriate defaults
        version_data = version_data or {}
        cleaned_version_data = {}
        
        # Get field types from the model
        for field in ProductionSiteVersion._meta.get_fields():
            if not hasattr(field, 'column'):
                continue
            
            field_name = field.name
            if field_name not in version_data:
                continue
            
            value = version_data[field_name]
            field_type = field.get_internal_type()
            
            # Clean value based on field type
            if field_type in ('IntegerField', 'PositiveIntegerField', 'FloatField', 'DecimalField'):
                # Numeric fields: empty string -> None
                if value == '' or value is None:
                    cleaned_version_data[field_name] = None
                else:
                    try:
                        if field_type == 'FloatField' or field_type == 'DecimalField':
                            cleaned_version_data[field_name] = float(value)
                        else:
                            cleaned_version_data[field_name] = int(value)
                    except (ValueError, TypeError):
                        cleaned_version_data[field_name] = None
            elif field_type == 'BooleanField':
                # Boolean fields: ensure actual boolean
                if value in ('', None):
                    cleaned_version_data[field_name] = False
                else:
                    cleaned_version_data[field_name] = bool(value)
            else:
                # String fields: keep as is, but None -> ''
                cleaned_version_data[field_name] = value if value is not None else ''
        
        # =================================================================
        # CREATE FULL COMPANY SNAPSHOT FOR INITIAL VERSION
        # =================================================================
        
        # Company Information Snapshot
        company_data_snapshot = {
            'company_name': self.company_name,
            'address_1': self.address_1 or '',
            'address_2': self.address_2 or '',
            'address_3': self.address_3 or '',
            'address_4': self.address_4 or '',
            'region': self.region or '',
            'country': self.country or '',
            'geographical_coverage': self.geographical_coverage or '',
            'phone_number': self.phone_number or '',
            'company_email': self.company_email or '',
            'website': self.website or '',
            'accreditation': self.accreditation or '',
            'parent_company': self.parent_company or '',
            'status': self.status,
            'unique_key': self.unique_key,
        }
        
        # Contact Information Snapshot
        contact_data_snapshot = {}
        for i in range(1, 5):
            contact_data_snapshot[f'title_{i}'] = getattr(self, f'title_{i}', '') or ''
            contact_data_snapshot[f'initials_{i}'] = getattr(self, f'initials_{i}', '') or ''
            contact_data_snapshot[f'surname_{i}'] = getattr(self, f'surname_{i}', '') or ''
            contact_data_snapshot[f'position_{i}'] = getattr(self, f'position_{i}', '') or ''
        
        # Notes Snapshot
        notes_snapshot = []
        for note in self.notes.all():
            notes_snapshot.append({
                'note_id': str(note.note_id),
                'note_type': note.note_type,
                'content': note.content,
                'created_at': note.created_at.isoformat() if note.created_at else None,
                'created_by': note.created_by.username if note.created_by else None,
                'is_pinned': note.is_pinned,
            })
        
        # =================================================================
        # TECHNICAL DATA SNAPSHOT - capture ALL technical fields with defaults
        # This ensures we have a complete frozen snapshot of initial state
        # =================================================================
        
        # Fields to exclude from technical snapshot (metadata/non-technical fields)
        excluded_technical_fields = {
            'version_id', 'production_site', 'version_number', 'is_current',
            'is_initial', 'is_active', 'version_notes', 'created_at', 'updated_at',
            'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
            'technical_data_snapshot', 'verified_at', 'verified_by', 'created_by',
            'id', 'pk'
        }
        
        technical_data_snapshot = {}
        
        # Iterate through ALL fields on ProductionSiteVersion model
        for field in ProductionSiteVersion._meta.get_fields():
            # Skip if not a concrete field (relations, etc.)
            if not hasattr(field, 'column'):
                continue
            
            field_name = field.name
            
            # Skip excluded fields
            if field_name in excluded_technical_fields:
                continue
            
            # Use provided value if available, otherwise use field's default
            if field_name in cleaned_version_data:
                technical_data_snapshot[field_name] = cleaned_version_data[field_name]
            else:
                # Get the default value for this field
                field_type = field.get_internal_type()
                if field_type == 'BooleanField':
                    technical_data_snapshot[field_name] = False
                elif field_type in ('IntegerField', 'PositiveIntegerField', 'FloatField', 'DecimalField'):
                    technical_data_snapshot[field_name] = None
                elif field_type in ('CharField', 'TextField'):
                    technical_data_snapshot[field_name] = ''
                else:
                    # For any other field type, try to get default or use None
                    technical_data_snapshot[field_name] = getattr(field, 'default', None)
                    if callable(technical_data_snapshot[field_name]):
                        technical_data_snapshot[field_name] = None
        
        # Create Initial Version (version_number=0, is_initial=True)
        version = ProductionSiteVersion.objects.create(
            production_site=site,
            version_number=0,
            is_current=True,
            is_active=True,
            is_initial=True,
            version_notes='Initial Version',
            created_by=created_by,
            company_data_snapshot=company_data_snapshot,
            contact_data_snapshot=contact_data_snapshot,
            notes_snapshot=notes_snapshot,
            technical_data_snapshot=technical_data_snapshot,
            **cleaned_version_data
        )
        
        return site, version


# =============================================================================
# PRODUCTION SITE MODEL (Category Container)
# =============================================================================

# =============================================================================
# COMPANY CATEGORY CHOICES (duplicated here to avoid circular import)
# =============================================================================

class CompanyCategory(models.TextChoices):
    """The 10 main production categories"""
    INJECTION = 'INJECTION', 'Injection Moulders'
    BLOW = 'BLOW', 'Blow Moulders'
    ROTO = 'ROTO', 'Roto Moulders'
    PE_FILM = 'PE_FILM', 'PE Film Extruders'
    SHEET = 'SHEET', 'Sheet Extruders'
    PIPE = 'PIPE', 'Pipe Extruders'
    TUBE_HOSE = 'TUBE_HOSE', 'Tube & Hose Extruders'
    PROFILE = 'PROFILE', 'Profile Extruders'
    CABLE = 'CABLE', 'Cable Extruders'
    COMPOUNDER = 'COMPOUNDER', 'Compounders'


class ProductionSite(models.Model):
    """
    Represents a production capability of a company in a specific category.
    
    Each company can have multiple production sites (one per category).
    The actual data is stored in ProductionSiteVersion for version control.
    """
    
    site_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )
    
    # Link to parent company
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='production_sites'
    )
    
    # Category for this production site
    category = models.CharField(
        max_length=20,
        choices=CompanyCategory.choices,
        help_text="Production category"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_production_sites'
    )
    
    class Meta:
        unique_together = ['company', 'category']  # One site per category per company
        ordering = ['category']
        indexes = [
            models.Index(fields=['company', 'category']),
        ]
    
    def __str__(self):
        return f"{self.company.company_name} - {self.get_category_display()}"
    
    @property
    def current_version(self):
        """Get the current active version of this production site"""
        return self.versions.filter(is_current=True).first()
    
    @property
    def is_active(self):
        """Check if this production site has an active version"""
        current = self.current_version
        return current and current.is_active
    
    @property
    def version_count(self):
        """Get the number of versions"""
        return self.versions.count()
    
    def create_new_version(self, created_by, version_notes='', copy_from_current=True, **field_updates):
        """
        Create a new version for this production site.
        
        Args:
            created_by: User creating the version
            version_notes: Notes about what changed
            copy_from_current: If True, copy data from current version
            **field_updates: Fields to update in the new version
            
        Returns:
            ProductionSiteVersion: The new version
        """
        current = self.current_version
        new_version_number = self.versions.count() + 1
        
        # Build new version data
        if copy_from_current and current:
            # Get all field values from current version
            version_data = {}
            for field in ProductionSiteVersion._meta.fields:
                if field.name not in ['version_id', 'production_site', 'version_number', 
                                       'is_current', 'created_at', 'created_by', 'version_notes',
                                       'verified_at', 'verified_by']:
                    version_data[field.name] = getattr(current, field.name)
            
            # Apply updates
            version_data.update(field_updates)
        else:
            version_data = field_updates
        
        # Create new version
        new_version = ProductionSiteVersion.objects.create(
            production_site=self,
            version_number=new_version_number,
            is_current=True,
            created_by=created_by,
            version_notes=version_notes,
            **version_data
        )
        
        return new_version


# =============================================================================
# PRODUCTION SITE VERSION MODEL (Versioned Data)
# =============================================================================

class ProductionSiteVersion(models.Model):
    """
    Stores versioned data for each production site.
    
    This model contains ALL the category-specific fields from SuperdatabaseRecord.
    Each version represents a point-in-time snapshot of the production data.
    
    Key Features:
    - Version number tracking
    - is_current flag (only one per production site)
    - is_active flag (to mark ceased production)
    - Full audit trail
    """
    
    version_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )
    
    # Link to production site
    production_site = models.ForeignKey(
        ProductionSite,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    
    # ==========================================================================
    # VERSION CONTROL
    # ==========================================================================
    
    version_number = models.PositiveIntegerField(default=1)
    
    is_current = models.BooleanField(
        default=True,
        help_text="True if this is the current version"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="False if production has ceased in this category"
    )
    
    version_notes = models.TextField(
        blank=True,
        help_text="Notes about what changed in this version"
    )
    
    # ==========================================================================
    # FULL COMPANY SNAPSHOT (captured at version creation time)
    # ==========================================================================

    company_data_snapshot = models.JSONField(
    default=dict,
    blank=True,
    help_text="Snapshot of company info at version creation time"
    )

    contact_data_snapshot = models.JSONField(
    default=dict,
    blank=True,
    help_text="Snapshot of contact info at version creation time"
    )

    notes_snapshot = models.JSONField(
    default=list,
    blank=True,
    help_text="Snapshot of notes at version creation time"
    )

    technical_data_snapshot = models.JSONField(
        default=dict,
        blank=True,
        help_text="Snapshot of technical fields at version creation time"
    )

    is_initial = models.BooleanField(
        default=False,
        help_text="True if this is the Initial Version (baseline snapshot, cannot be deleted)"
    )
    
    # Verification Status
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_versions'
    )
    
    # ==========================================================================
    # GENERAL OPERATIONS & MATERIALS
    # ==========================================================================
    
    custom = models.BooleanField("Custom", default=False)
    proprietary_products = models.BooleanField("Proprietary Products", default=False)
    in_house = models.BooleanField("In House", default=False)
    other_materials = models.CharField("Other Materials", max_length=255, blank=True)
    main_materials = models.CharField("Main Materials", max_length=255, blank=True)
    polymer_range_number = models.IntegerField("Polymer Range Number", null=True, blank=True)
    polymer_range = models.CharField("Polymer Range", max_length=100, blank=True)
    compound_in_house = models.BooleanField("Compound in House", default=False)
    buy_in_compounds = models.BooleanField("Buy in Compounds", default=False)
    
    # ==========================================================================
    # MATERIAL FLAGS (Polymers) - All Boolean Fields
    # ==========================================================================
    
    abs = models.BooleanField("ABS", default=False)
    acetal = models.BooleanField("Acetal", default=False)
    apet = models.BooleanField("APET", default=False)
    bioresins = models.BooleanField("Bioresins", default=False)
    other_bioresins = models.CharField("Other Bioresins", max_length=255, blank=True)
    cellular_pe = models.BooleanField("Cellular PE", default=False)
    cpe = models.BooleanField("CPE", default=False)
    cpet = models.BooleanField("CPET", default=False)
    cspe = models.BooleanField("CSPE", default=False)
    eaa_eba = models.BooleanField("EAA/EBA", default=False)
    elastomers = models.BooleanField("Elastomers", default=False)
    epdm = models.BooleanField("EPDM", default=False)
    epr = models.BooleanField("EPR", default=False)
    eva = models.BooleanField("EVA", default=False)
    flexible_pvc = models.BooleanField("Flexible PVC", default=False)
    fluoropolymers = models.BooleanField("Fluoropolymers", default=False)
    hdpe = models.BooleanField("HDPE", default=False)
    hdpe_mdpe = models.BooleanField("HDPE/MDPE", default=False)
    ionomer = models.BooleanField("Ionomer", default=False)
    ldpe = models.BooleanField("LDPE", default=False)
    lldpe = models.BooleanField("LLDPE", default=False)
    lldpe_c4 = models.BooleanField("LLDPE C4", default=False)
    lldpe_c6 = models.BooleanField("LLDPE C6", default=False)
    lldpe_c8 = models.BooleanField("LLDPE C8", default=False)
    lsf0h = models.BooleanField("LSF0H", default=False)
    mdpe = models.BooleanField("MDPE", default=False)
    mlldpe = models.BooleanField("MLLDPE", default=False)
    modified_pvc = models.BooleanField("Modified PVC", default=False)
    oriented_pvc = models.BooleanField("Oriented PVC", default=False)
    pa = models.BooleanField("PA", default=False)
    pa6 = models.BooleanField("PA6", default=False)
    pa11 = models.BooleanField("PA11", default=False)
    pa12 = models.BooleanField("PA12", default=False)
    pa66 = models.BooleanField("PA66", default=False)
    pbt = models.BooleanField("PBT", default=False)
    pc = models.BooleanField("PC", default=False)
    pe100 = models.BooleanField("PE100", default=False)
    pe100rc = models.BooleanField("PE100RC", default=False)
    pe80 = models.BooleanField("PE80", default=False)
    peek = models.BooleanField("PEEK", default=False)
    pert = models.BooleanField("PERT", default=False)
    pet = models.BooleanField("PET", default=False)
    petg = models.BooleanField("PETG", default=False)
    pla = models.BooleanField("PLA", default=False)
    pmma = models.BooleanField("PMMA", default=False)
    polybutylene = models.BooleanField("PolyButylene", default=False)
    pom = models.BooleanField("POM", default=False)
    pp = models.BooleanField("PP", default=False)
    pp_r = models.BooleanField("PP-R", default=False)
    ppo = models.BooleanField("PPO", default=False)
    ps = models.BooleanField("PS", default=False)
    psu = models.BooleanField("PSU", default=False)
    pvc = models.BooleanField("PVC", default=False)
    pvcc = models.BooleanField("PVCc", default=False)
    recycled_materials = models.BooleanField("Recycled Materials", default=False)
    rigid_pvc = models.BooleanField("Rigid PVC", default=False)
    san = models.BooleanField("SAN", default=False)
    sebs = models.BooleanField("SEBS", default=False)
    silicone = models.BooleanField("Silicone", default=False)
    thermosets = models.BooleanField("Thermosets", default=False)
    tpes = models.BooleanField("TPEs", default=False)
    tpes_type = models.CharField("TPEs Type", max_length=100, blank=True)
    tpe_e = models.BooleanField("TPE-E", default=False)
    tpu = models.BooleanField("TPU", default=False)
    tpv = models.BooleanField("TPV", default=False)
    uhmwpe = models.BooleanField("UHMWPE", default=False)
    wpc = models.BooleanField("WPC", default=False)
    xlpe = models.BooleanField("XLPE", default=False)
    
    # ==========================================================================
    # APPLICATION MARKETS - All Boolean Fields
    # ==========================================================================
    
    aerosol_overcaps = models.BooleanField("Aerosol Overcaps", default=False)
    aerospace = models.BooleanField("Aerospace", default=False)
    agricultural_drainage = models.BooleanField("Agricultural Drainage", default=False)
    agricultural_film = models.BooleanField("Agricultural Film", default=False)
    agricultural_greenhouse = models.BooleanField("Agricultural Greenhouse", default=False)
    agricultural_mulch = models.BooleanField("Agricultural Mulch", default=False)
    agricultural_silage = models.BooleanField("Agricultural Silage", default=False)
    air_conditioning = models.BooleanField("Air Conditioning", default=False)
    ambient_food = models.BooleanField("Ambient Food", default=False)
    appliances = models.BooleanField("Appliances", default=False)
    auto_fuel_tanks = models.BooleanField("Auto Fuel Tanks", default=False)
    automotive = models.BooleanField("Automotive", default=False)
    automotive_exterior = models.BooleanField("Automotive/Exterior", default=False)
    automotive_insulation = models.BooleanField("Automotive-Insulation", default=False)
    automotive_interior = models.BooleanField("Automotive/Interior", default=False)
    automotive_jacketing = models.BooleanField("Automotive-Jacketing", default=False)
    automotive_under_the_bonnet = models.BooleanField("Automotive/Under the Bonnet", default=False)
    automotive_vehicles_trucks = models.BooleanField("Automotive/Vehicles/Trucks", default=False)
    bakery_confectionary = models.BooleanField("Bakery/Confectionary", default=False)
    blinds = models.BooleanField("Blinds", default=False)
    boats_canoes_kayaks = models.BooleanField("Boats/Canoes/Kayaks", default=False)
    building = models.BooleanField("Building", default=False)
    building_film = models.BooleanField("Building Film", default=False)
    cable_protection = models.BooleanField("Cable Protection", default=False)
    caps_closures = models.BooleanField("Caps/Closures", default=False)
    carrier_bags = models.BooleanField("Carrier Bags", default=False)
    cartons_caps = models.BooleanField("Cartons Caps", default=False)
    chemical_un_tanks = models.BooleanField("Chemical UN Tanks", default=False)
    chilled_food = models.BooleanField("Chilled Food", default=False)
    cladding = models.BooleanField("Cladding", default=False)
    computer_cable_insulation = models.BooleanField("Computer Cable-Insulation", default=False)
    computer_cable_jacketing = models.BooleanField("Computer Cable-Jacketing", default=False)
    cosmetics_packaging = models.BooleanField("Cosmetics Packaging", default=False)
    crates_boxes = models.BooleanField("Crates/Boxes", default=False)
    cups = models.BooleanField("Cups", default=False)
    data_cable_insulation = models.BooleanField("Data Cable-Insulation", default=False)
    data_cable_jacketing = models.BooleanField("Data Cable-Jacketing", default=False)
    decking = models.BooleanField("Decking", default=False)
    display = models.BooleanField("Display", default=False)
    door = models.BooleanField("Door", default=False)
    drainage_sewerage = models.BooleanField("Drainage Sewerage", default=False)
    dvd_cds = models.BooleanField("DVD/CDs", default=False)
    electrical = models.BooleanField("Electrical", default=False)
    electrical_components = models.BooleanField("Electrical Components", default=False)
    electrical_conduit = models.BooleanField("Electrical Conduit", default=False)
    fast_food = models.BooleanField("Fast Food", default=False)
    film_on_reel = models.BooleanField("Film on Reel", default=False)
    floor_panels = models.BooleanField("Floor Panels", default=False)
    flooring = models.BooleanField("Flooring", default=False)
    food_drink = models.BooleanField("Food/Drink", default=False)
    footballs = models.BooleanField("Footballs", default=False)
    freezer_film = models.BooleanField("Freezer Film", default=False)
    frozen_food = models.BooleanField("Frozen Food", default=False)
    fruit_vegetable = models.BooleanField("Fruit/Vegetable", default=False)
    furniture = models.BooleanField("Furniture", default=False)
    gas_transmission_distribution = models.BooleanField("Gas Transmission Distribution", default=False)
    glazing = models.BooleanField("Glazing", default=False)
    heating_oil_diesel_tanks = models.BooleanField("Heating Oil Diesel Tanks", default=False)
    high_voltage_36k_insulation = models.BooleanField("High Voltage 36K-Insulation", default=False)
    high_voltage_36k_jacketing = models.BooleanField("High Voltage 36K-Jacketing", default=False)
    horticulture_agriculture = models.BooleanField("Horticulture/Agriculture", default=False)
    household_chemicals = models.BooleanField("Household Chemicals", default=False)
    houseware = models.BooleanField("Houseware", default=False)
    housewares_non_electrical = models.BooleanField("Housewares/Non Electrical", default=False)
    hygiene_film = models.BooleanField("Hygiene Film", default=False)
    ibcs = models.BooleanField("IBCs", default=False)
    industrial_chemicals = models.BooleanField("Industrial Chemicals", default=False)
    industrial_sacks = models.BooleanField("Industrial Sacks", default=False)
    insulation = models.BooleanField("Insulation", default=False)
    internal_hot_cold_plumbing_heating = models.BooleanField("Internal Hot & Cold Plumbing Heating", default=False)
    internal_soil_waste_sewerage = models.BooleanField("Internal Soil Waste Sewerage", default=False)
    irrigation = models.BooleanField("Irrigation", default=False)
    laminating_film = models.BooleanField("Laminating Film", default=False)
    lids = models.BooleanField("Lids", default=False)
    lighting = models.BooleanField("Lighting", default=False)
    low_voltage_1k_insulation = models.BooleanField("Low Voltage 1K-Insulation", default=False)
    low_voltage_1k_jacketing = models.BooleanField("Low Voltage 1K-Jacketing", default=False)
    marine_fishing = models.BooleanField("Marine/Fishing", default=False)
    materials_handling_boxes = models.BooleanField("Materials Handling Boxes", default=False)
    materials_handling_pallets = models.BooleanField("Materials Handling Pallets", default=False)
    meat_fish = models.BooleanField("Meat/Fish", default=False)
    medical = models.BooleanField("Medical", default=False)
    medical_containers = models.BooleanField("Medical Containers", default=False)
    medical_devices = models.BooleanField("Medical Devices", default=False)
    medium_voltage_1_36k_insulation = models.BooleanField("Medium Voltage 1-36K-Insulation", default=False)
    medium_voltage_1_36k_jacketing = models.BooleanField("Medium Voltage 1-36K-Jacketing", default=False)
    membrane = models.BooleanField("Membrane", default=False)
    metallic_insulation = models.BooleanField("Metallic-Insulation", default=False)
    metallic_jacketing = models.BooleanField("Metallic-Jacketing", default=False)
    microphone_cable_insulation = models.BooleanField("Microphone Cable-Insulation", default=False)
    microphone_cable_jacketing = models.BooleanField("Microphone Cable-Jacketing", default=False)
    mining_insulation = models.BooleanField("Mining-Insulation", default=False)
    mining_jacketing = models.BooleanField("Mining-Jacketing", default=False)
    optical_insulation = models.BooleanField("Optical-Insulation", default=False)
    optical_jacketing = models.BooleanField("Optical-Jacketing", default=False)
    ovenable = models.BooleanField("Ovenable", default=False)
    packaging = models.BooleanField("Packaging", default=False)
    pails = models.BooleanField("Pails", default=False)
    pannelling = models.BooleanField("Pannelling", default=False)
    personal_care = models.BooleanField("Personal Care", default=False)
    pet_accessories = models.BooleanField("Pet Accessories", default=False)
    pipe_fittings = models.BooleanField("Pipe Fittings", default=False)
    plenum_insulation = models.BooleanField("Plenum-Insulation", default=False)
    plenum_jacketing = models.BooleanField("Plenum-Jacketing", default=False)
    pos_mannequins_displays = models.BooleanField("POS/Mannequins/Displays", default=False)
    preform = models.BooleanField("Preform", default=False)
    protective_packaging = models.BooleanField("Protective Packaging", default=False)
    pumps = models.BooleanField("Pumps", default=False)
    push_on_caps = models.BooleanField("Push-on Caps", default=False)
    refuse_sacks = models.BooleanField("Refuse Sacks", default=False)
    retail_pos_packaging = models.BooleanField("Retail/POS Packaging", default=False)
    road_furniture = models.BooleanField("Road Furniture", default=False)
    road_railways_drainage = models.BooleanField("Road Railways Drainage", default=False)
    roof_gutter_systems = models.BooleanField("Roof Gutter Systems", default=False)
    screwcaps = models.BooleanField("Screwcaps", default=False)
    seals_gaskets = models.BooleanField("Seals/Gaskets", default=False)
    septic_tanks = models.BooleanField("Septic Tanks", default=False)
    shrink_fill_collation = models.BooleanField("Shrink Fill Collation", default=False)
    shrink_film_pallet = models.BooleanField("Shrink Film Pallet", default=False)
    shutters = models.BooleanField("Shutters", default=False)
    soffits_bargeboard_compact = models.BooleanField("Soffits Bargeboard Compact", default=False)
    soffits_bargeboard_foamed = models.BooleanField("Soffits Bargeboard Foamed", default=False)
    sport_leisure = models.BooleanField("Sport/Leisure", default=False)
    stationery_supplies = models.BooleanField("Stationery Supplies", default=False)
    storm_water_drainage = models.BooleanField("Storm Water Drainage", default=False)
    stretch_film = models.BooleanField("Stretch Film", default=False)
    stretch_hood = models.BooleanField("Stretch Hood", default=False)
    technical_moulding = models.BooleanField("Technical Moulding", default=False)
    telectronics = models.BooleanField("Telectronics", default=False)
    thin_wall_food_packaging = models.BooleanField("Thin Wall Food Packaging", default=False)
    toys = models.BooleanField("Toys", default=False)
    trunking = models.BooleanField("Trunking", default=False)
    tubes = models.BooleanField("Tubes", default=False)
    underground_fittings = models.BooleanField("Underground Fittings", default=False)
    waste_container_bottle_banks = models.BooleanField("Waste Container/Bottle Banks", default=False)
    water_supply_distribution = models.BooleanField("Water Supply Distribution", default=False)
    water_tank_other_tanks = models.BooleanField("Water Tank/Other Tanks", default=False)
    window = models.BooleanField("Window", default=False)
    yellow_fats = models.BooleanField("Yellow Fats", default=False)
    
    # Text descriptions for application areas
    automotive_description = models.TextField("Automotive Description", blank=True)
    electrical_description = models.TextField("Electrical Description", blank=True)
    houseware_description = models.TextField("Houseware Description", blank=True)
    medical_description = models.TextField("Medical Description", blank=True)
    packaging_description = models.TextField("Packaging Description", blank=True)
    other_products = models.TextField("Other Products", blank=True)
    main_applications = models.CharField("Main Applications", max_length=255, blank=True)
    other_industrial_markets = models.CharField("Other Industrial Markets", max_length=255, blank=True)
    other_food_packaging = models.CharField("Other Food Packaging", max_length=255, blank=True)
    non_food_packaging = models.CharField("Non Food Packaging", max_length=255, blank=True)
    construction_other = models.CharField("Construction Other", max_length=255, blank=True)
    
    # ==========================================================================
    # SERVICES - All Boolean and Text Fields
    # ==========================================================================
    
    assembly = models.BooleanField("Assembly", default=False)
    clean_room = models.BooleanField("Clean Room", default=False)
    design = models.BooleanField("Design", default=False)
    electroplating_metalizing = models.BooleanField("Electroplating/Metalizing", default=False)
    embossing = models.BooleanField("Embossing", default=False)
    filling = models.BooleanField("Filling", default=False)
    gas_water_assisted_moulding = models.BooleanField("Gas Water Assisted Moulding", default=False)
    high_frequency_welding = models.BooleanField("High Frequency Welding", default=False)
    hot_foil_stamping = models.BooleanField("Hot Foil Stamping", default=False)
    inmould_labelling = models.BooleanField("Inmould Labelling", default=False)
    insert_moulding = models.BooleanField("Insert Moulding", default=False)
    just_in_time = models.BooleanField("Just in Time", default=False)
    labelling = models.BooleanField("Labelling", default=False)
    machining = models.BooleanField("Machining", default=False)
    offset_printing = models.BooleanField("Offset Printing", default=False)
    pad_printing = models.BooleanField("Pad Printing", default=False)
    painting = models.BooleanField("Painting", default=False)
    printing = models.BooleanField("Printing", default=False)
    product_development = models.BooleanField("Product Development", default=False)
    product_lamination = models.BooleanField("Product Lamination", default=False)
    recycling = models.BooleanField("Recycling", default=False)
    silk_screen_printing = models.BooleanField("Silk Screen Printing", default=False)
    tool_design = models.BooleanField("Tool Design", default=False)
    tool_manufacture = models.BooleanField("Tool Manufacture", default=False)
    twin_multi_shot_moulding = models.BooleanField("Twin Multi Shot Moulding", default=False)
    ultrasonic_welding = models.BooleanField("Ultrasonic Welding", default=False)
    welding = models.BooleanField("Welding", default=False)
    flexo_printing = models.BooleanField("Flexo Printing", default=False)
    gravure_printing = models.BooleanField("Gravure Printing", default=False)
    three_d_printing = models.BooleanField("3D Printing", default=False)
    other_printing = models.CharField("Other Printing", max_length=255, blank=True)
    other_services = models.CharField("Other Services", max_length=255, blank=True)
    other_welding = models.CharField("Other Welding", max_length=255, blank=True)
    
    # ==========================================================================
    # MACHINE & TECHNICAL SPECS
    # ==========================================================================
    
    # Injection Moulding
    minimal_lock_tonnes = models.IntegerField("Minimal Lock (in tonnes)", null=True, blank=True)
    maximum_lock_tonnes = models.IntegerField("Maximum Lock (in tonnes)", null=True, blank=True)
    minimum_shot_grammes = models.IntegerField("Minimum Shot (in grammes)", null=True, blank=True)
    maximum_shot_grammes = models.IntegerField("Maximum Shot (in grammes)", null=True, blank=True)
    number_of_machines = models.IntegerField("Number of Machines", null=True, blank=True)
    machinery_brand = models.CharField("Machinery Brand", max_length=255, blank=True)
    
    # Blow Moulding
    under_1_litre = models.BooleanField("Under 1 Litre", default=False)
    from_1_to_5_litres = models.BooleanField("From 1 to 5 Litres", default=False)
    from_5_to_25_litres = models.BooleanField("From 5 to 25 Litres", default=False)
    from_25_to_220_litres = models.BooleanField("From 25 to 220 Litres", default=False)
    over_220_litres = models.BooleanField("Over 220 Litres", default=False)
    multilayer = models.BooleanField("Multilayer", default=False)
    extrusion_blow_moulding_machines = models.IntegerField("Extrusion Blow Moulding Machines", null=True, blank=True)
    injection_blow_moulding_machines = models.IntegerField("Injection Blow Moulding Machines", null=True, blank=True)
    injection_stretch_blow_moulding_stage_1_machines = models.IntegerField(
        "Injection Stretch Blow Moulding Stage 1 Machines", null=True, blank=True)
    injection_stretch_blow_moulding_stage_2_machines = models.IntegerField(
        "Injection Stretch Blow Moulding Stage 2 Machines", null=True, blank=True)
    buy_in_preform = models.BooleanField("Buy in Preform", default=False)
    buy_in_preform_percentage = models.IntegerField("Buy in Preform Percentage", null=True, blank=True)
    
    # Film & Sheet
    minimum_size = models.CharField("Minimum Size", max_length=100, blank=True)
    maximum_size = models.CharField("Maximum Size", max_length=100, blank=True)
    minimum_width_mm = models.FloatField("Minimum width (in mm)", null=True, blank=True)
    maximum_width_mm = models.FloatField("Maximum width (in mm)", null=True, blank=True)
    number_of_layers = models.IntegerField("Number of Layers", null=True, blank=True)
    cast_lines = models.IntegerField("Cast Lines", null=True, blank=True)
    blown_lines = models.IntegerField("Blow Lines", null=True, blank=True)
    number_of_colours = models.IntegerField("Number of Colours", null=True, blank=True)
    other_films = models.CharField("Other Films", max_length=255, blank=True)
    biodegradable_bags = models.BooleanField("Biodegradable Bags", default=False)
    other_bags = models.BooleanField("Other Bags", default=False)
    other_sacks = models.BooleanField("Other Sacks", default=False)
    
    # Sheet specific
    minimum_gauge_mm = models.FloatField("Minimum gauge (in mm)", null=True, blank=True)
    maximum_gauge_mm = models.FloatField("Maximum gauge (in mm)", null=True, blank=True)
    flame_retardant_sheet = models.BooleanField("Flame Retardant Sheet", default=False)
    embossed_sheet = models.BooleanField("Embossed Sheet", default=False)
    coated_sheet = models.BooleanField("Coated Sheet", default=False)
    laminated_sheet = models.BooleanField("Laminated Sheet", default=False)
    foamed_sheet = models.BooleanField("Foamed Sheet", default=False)
    corrugated_sheet = models.BooleanField("Corrugated Sheet", default=False)
    profiled_sheet = models.BooleanField("Profiled Sheet", default=False)
    coextruded_sheet = models.BooleanField("Coextruded Sheet", default=False)
    plain_sheet = models.BooleanField("Plain Sheet", default=False)
    cross_linked_sheet = models.BooleanField("Cross Linked Sheet", default=False)
    other_type_of_sheet = models.CharField("Other Type of Sheet", max_length=255, blank=True)
    
    # Process types
    extrusion_process = models.BooleanField("Extrusion Process", default=False)
    number_of_extrusion_lines = models.IntegerField("Number of Extrusion Lines", null=True, blank=True)
    coextrusion_process = models.BooleanField("Coextrusion Process", default=False)
    number_of_coextrusion_lines = models.IntegerField("Number of Coextrusion Lines", null=True, blank=True)
    calendering_process = models.BooleanField("Calendering Process", default=False)
    number_of_calendering_lines = models.IntegerField("Number of Calendering Lines", null=True, blank=True)
    pressing_process = models.BooleanField("Pressing Process", default=False)
    number_of_pressed_lines = models.IntegerField("Number of Pressed Lines", null=True, blank=True)
    liquid_cell_casting = models.BooleanField("Liquid Cell Casting", default=False)
    number_of_lcc_line = models.IntegerField("Number of LCC Line", null=True, blank=True)
    in_line_process = models.CharField("In Line Process", max_length=255, blank=True)
    
    # Pipe specific
    below_ground_pressure = models.BooleanField("Below Ground Pressure", default=False)
    below_ground_non_pressure = models.BooleanField("Below Ground Non Pressure", default=False)
    above_ground_pressure = models.BooleanField("Above Ground Pressure", default=False)
    above_ground_non_pressure = models.BooleanField("Above Ground Non Pressure", default=False)
    other_pipes = models.CharField("Other Pipes", max_length=255, blank=True)
    
    # Pipe sizes
    up_to_32_mm = models.BooleanField("Up to 32 mm", default=False)
    between_33_63_mm = models.BooleanField("Between 33 & 63 mm", default=False)
    between_64_90_mm = models.BooleanField("Between 64 & 90 mm", default=False)
    between_91_109_mm = models.BooleanField("Between 91 & 109 mm", default=False)
    between_110_160_mm = models.BooleanField("Between 110 & 160 mm", default=False)
    between_161_250_mm = models.BooleanField("Between 161 & 250 mm", default=False)
    between_251_400_mm = models.BooleanField("Between 251 & 400 mm", default=False)
    between_401_500_mm = models.BooleanField("Between 401 & 500 mm", default=False)
    between_501_630_mm = models.BooleanField("Between 501 & 630 mm", default=False)
    between_631_1000_mm = models.BooleanField("Between 631 & 1000 mm", default=False)
    between_1001_1200_mm = models.BooleanField("Between 1001 & 1200 mm", default=False)
    over_1200_mm = models.BooleanField("Over 1200 mm", default=False)
    
    # Pipe technologies
    coextruded_foam_core = models.BooleanField("Coextruded Foam Core", default=False)
    twin_wall = models.BooleanField("Twin Wall", default=False)
    multilayer_polymeric = models.BooleanField("Multilayer Polymeric", default=False)
    multilayer_polymer_metal = models.BooleanField("Multilayer Polymer Metal", default=False)
    reinforced_wall = models.BooleanField("Reinforced Wall", default=False)
    solid_wall = models.BooleanField("Solid Wall", default=False)
    other_technologies = models.CharField("Other Technologies", max_length=255, blank=True)
    
    # Tube & Hose
    hydraulic = models.BooleanField("Hydraulic", default=False)
    pneumatic = models.BooleanField("Pneumatic", default=False)
    flexible = models.BooleanField("Flexible", default=False)
    rigid_shapes = models.BooleanField("Rigid Shapes", default=False)
    monolayer = models.BooleanField("Monolayer", default=False)
    extrusion_foam = models.BooleanField("Extrusion Foam", default=False)
    corrugated_extrusion = models.BooleanField("Corrugated Extrusion", default=False)
    bi_colour = models.BooleanField("Bi Colour", default=False)
    minimum_diameter_mm = models.IntegerField("Minimum diameter (in mm)", null=True, blank=True)
    maximum_diameter_mm = models.IntegerField("Maximum diameter (in mm)", null=True, blank=True)
    
    # Compounding
    reprocessing = models.BooleanField("Reprocessing", default=False)
    colour_compounds = models.BooleanField("Colour Compounds", default=False)
    flame_retardant_compounds = models.BooleanField("Flame Retardant Compounds", default=False)
    mineral_filled_compounds = models.BooleanField("Mineral Filled Compounds", default=False)
    glass_filled_compounds = models.BooleanField("Glass Filled Compounds", default=False)
    elastomer_modified_compounds = models.BooleanField("Elastomer Modified Compounds", default=False)
    cross_linked_compounds = models.BooleanField("Cross Linked Compounds", default=False)
    carbon_fibre_compounds = models.BooleanField("Carbon Fibre Compounds", default=False)
    natural_fibre_compounds = models.BooleanField("Natural Fibre Compounds", default=False)
    other_compounds = models.CharField("Other Compounds", max_length=255, blank=True)
    compounds_percentage = models.IntegerField("Compounds Percentage", null=True, blank=True)
    compounds_applications = models.CharField("Compounds Applications", max_length=255, blank=True)
    
    # Masterbatch
    black_masterbatch = models.BooleanField("Black Masterbatch", default=False)
    white_masterbatch = models.BooleanField("White Masterbatch", default=False)
    colour_masterbatch = models.BooleanField("Colour Masterbatch", default=False)
    additive_masterbatch = models.BooleanField("Additive Masterbatch", default=False)
    liquid_masterbatch = models.BooleanField("Liquid Masterbatch", default=False)
    other_masterbatches = models.CharField("Other Masterbatches", max_length=255, blank=True)
    masterbatch_percentage = models.IntegerField("Masterbatch Percentage", null=True, blank=True)
    masterbatches_applications = models.CharField("Masterbatch Applications", max_length=255, blank=True)
    
    # Compounder machines
    twin_screw_extruders = models.IntegerField("Twin Screw Extruders", null=True, blank=True)
    single_screw_extruders = models.IntegerField("Single Screw Extruders", null=True, blank=True)
    batch_mixers = models.IntegerField("Batch Mixers", null=True, blank=True)
    polymer_producer = models.BooleanField("Polymer Producer", default=False)
    production_volume_number = models.IntegerField("Production Volume Number", null=True, blank=True)
    
    # ==========================================================================
    # AUDIT FIELDS
    # ==========================================================================
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_versions'
    )
    
    class Meta:
        ordering = ['-version_number']
        unique_together = ['production_site', 'version_number']
        indexes = [
            models.Index(fields=['production_site', 'is_current']),
            models.Index(fields=['production_site', '-version_number']),
        ]
    
    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        current = " [Current]" if self.is_current else ""
        return f"{self.production_site} - v{self.version_number} ({status}){current}"
    
    def save(self, *args, **kwargs):
        # When saving a new current version, mark old ones as not current
        if self.is_current and self.pk is None:  # Only for new versions
            ProductionSiteVersion.objects.filter(
                production_site=self.production_site,
                is_current=True
            ).update(is_current=False)
        super().save(*args, **kwargs)


# =============================================================================
# COMPANY NOTE MODEL (Comments/Notes)
# =============================================================================

class CompanyNote(models.Model):
    """
    Notes and comments for companies.
    Tracks which user wrote which note.
    """
    
    NOTE_TYPES = [
        ('GENERAL', 'General Note'),
        ('CALL_LOG', 'Call Log'),
        ('VERIFICATION', 'Verification Note'),
        ('INTERNAL', 'Internal Note'),
        ('ADMIN', 'Admin Note'),
        ('CRM', 'CRM Note'),
    ]
    
    note_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    
    # Optional link to specific production site
    production_site = models.ForeignKey(
        ProductionSite,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notes',
        help_text="Link to specific production site (optional)"
    )
    
    note_type = models.CharField(
        max_length=20,
        choices=NOTE_TYPES,
        default='GENERAL'
    )
    
    content = models.TextField()
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='company_notes'
    )
    
    is_pinned = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['company', '-created_at']),
            models.Index(fields=['company', 'note_type']),
        ]
    
    def __str__(self):
        return f"Note by {self.created_by} on {self.company.company_name} ({self.get_note_type_display()})"


# =============================================================================
# COMPANY HISTORY MODEL (Audit Trail)
# =============================================================================

class CompanyHistory(models.Model):
    """
    Audit trail for company-level changes.
    """
    
    ACTION_TYPES = [
        ('CREATED', 'Company Created'),
        ('UPDATED', 'Company Updated'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('SITE_ADDED', 'Production Site Added'),
        ('SITE_REMOVED', 'Production Site Removed'),
        ('VERSION_CREATED', 'New Version Created'),
        ('MERGED', 'Companies Merged'),
        ('NOTE_ADDED', 'Note Added'),
    ]
    
    history_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        primary_key=True
    )
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='history'
    )
    
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='company_history_actions'
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    description = models.TextField(blank=True)
    
    # Store changed fields as JSON
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dictionary of field changes"
    )
    
    # Optional references
    related_production_site = models.ForeignKey(
        ProductionSite,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    related_version = models.ForeignKey(
        ProductionSiteVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "Company Histories"
        indexes = [
            models.Index(fields=['company', '-timestamp']),
            models.Index(fields=['performed_by', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.company.company_name} by {self.performed_by}"