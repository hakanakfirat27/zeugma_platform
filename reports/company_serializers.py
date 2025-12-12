# reports/company_serializers.py
"""
Serializers for Company-Centric Database Models

These serializers handle:
- Company CRUD operations
- Production site management
- Version history
- Duplicate checking
- Notes/comments

The serializers support the new company-centric architecture where:
- One Company can have multiple ProductionSites
- Each ProductionSite can have multiple Versions
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .company_models import (
    Company, ProductionSite, ProductionSiteVersion,
    CompanyNote, CompanyHistory, CompanyStatus
)
from .models import CompanyCategory
from .fields import (
    COMMON_FIELDS, CONTACT_FIELDS, 
    INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
    PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS,
    TUBE_HOSE_FIELDS, PROFILE_FIELDS, CABLE_FIELDS,
    COMPOUNDER_FIELDS, RECYCLER_FIELDS
)

User = get_user_model()


# =============================================================================
# USER SERIALIZERS
# =============================================================================

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for nested serializers"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# =============================================================================
# COMPANY NOTE SERIALIZERS
# =============================================================================

class CompanyNoteSerializer(serializers.ModelSerializer):
    """Serializer for company notes"""
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)
    
    class Meta:
        model = CompanyNote
        fields = [
            'note_id', 'company', 'production_site',
            'note_type', 'note_type_display', 'content',
            'created_at', 'updated_at', 'created_by', 'created_by_info',
            'is_pinned'
        ]
        read_only_fields = ['note_id', 'created_at', 'updated_at', 'created_by']


class CompanyNoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notes"""
    
    class Meta:
        model = CompanyNote
        fields = ['note_type', 'content', 'production_site', 'is_pinned']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        validated_data['company'] = self.context['company']
        return super().create(validated_data)


# =============================================================================
# COMPANY HISTORY SERIALIZERS
# =============================================================================

class CompanyHistorySerializer(serializers.ModelSerializer):
    """Serializer for company audit history"""
    performed_by_info = UserBasicSerializer(source='performed_by', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = CompanyHistory
        fields = [
            'history_id', 'company', 'action', 'action_display',
            'performed_by', 'performed_by_info', 'timestamp',
            'description', 'changes', 'related_production_site', 'related_version'
        ]
        read_only_fields = fields


# =============================================================================
# PRODUCTION SITE VERSION SERIALIZERS
# =============================================================================

class ProductionSiteVersionListSerializer(serializers.ModelSerializer):
    """List serializer for versions (minimal data)"""
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    verified_by_info = UserBasicSerializer(source='verified_by', read_only=True)
    
    class Meta:
        model = ProductionSiteVersion
        fields = [
            'version_id', 'version_number', 'is_current', 'is_active', 'is_initial',
            'version_notes', 'created_at', 'created_by', 'created_by_info',
            'verified_at', 'verified_by', 'verified_by_info'
        ]
        read_only_fields = fields


class ProductionSiteVersionDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for versions (all fields)"""
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    verified_by_info = UserBasicSerializer(source='verified_by', read_only=True)
    category = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    display_fields = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionSiteVersion
        fields = '__all__'
    
    def get_category(self, obj):
        return obj.production_site.category
    
    def get_category_display(self, obj):
        return obj.production_site.get_category_display()
    
    def get_display_fields(self, obj):
        """Get fields relevant to this category"""
        category_field_map = {
            'INJECTION': INJECTION_FIELDS,
            'BLOW': BLOW_FIELDS,
            'ROTO': ROTO_FIELDS,
            'PE_FILM': PE_FILM_FIELDS,
            'SHEET': SHEET_FIELDS,
            'PIPE': PIPE_FIELDS,
            'TUBE_HOSE': TUBE_HOSE_FIELDS,
            'PROFILE': PROFILE_FIELDS,
            'CABLE': CABLE_FIELDS,
            'COMPOUNDER': COMPOUNDER_FIELDS,
            'RECYCLER': RECYCLER_FIELDS,
        }
        category = obj.production_site.category
        return category_field_map.get(category, [])


class ProductionSiteVersionFullSerializer(serializers.ModelSerializer):
    """
    Full serializer for versions - includes ALL technical fields.
    Used when we need to display version data in company detail modal.
    """
    class Meta:
        model = ProductionSiteVersion
        fields = '__all__'


class ProductionSiteVersionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new versions with full company snapshots"""
    
    class Meta:
        model = ProductionSiteVersion
        exclude = ['version_id', 'production_site', 'version_number', 
                   'is_current', 'is_initial', 'created_at', 'created_by',
                   'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
                   'technical_data_snapshot']
    
    def create(self, validated_data):
        from django.db.models import Max
        from django.db import transaction
        
        production_site = self.context['production_site']
        user = self.context['request'].user
        company = production_site.company
        
        with transaction.atomic():
            # Get current version to copy data from (this is always the Initial Version)
            current_version = production_site.current_version
            
            # Get next version number using MAX instead of count
            max_version = production_site.versions.aggregate(Max('version_number'))['version_number__max'] or 0
            version_number = max_version + 1
            
            # NOTE: We do NOT change is_current on the Initial Version!
            # The Initial Version always remains is_current=True because it holds the live working data.
            # Snapshot versions are read-only historical records.
            # The frontend will show "Current" badge on the latest snapshot (highest version_number).
            
            # Build version data - start with current version data, then apply new data
            version_data = {}
            
            # Fields to exclude when copying (these are metadata, not data)
            excluded_fields = {
                'version_id', 'id', 'production_site', 'production_site_id',
                'version_number', 'is_current', 'is_active', 'is_initial', 'created_at', 'created_by',
                'created_by_id', 'verified_at', 'verified_by', 'verified_by_id',
                'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
                'technical_data_snapshot'
            }
            
            # Copy all fields from current version
            if current_version:
                for field in ProductionSiteVersion._meta.get_fields():
                    if hasattr(field, 'concrete') and field.concrete:
                        field_name = field.name
                        if field_name not in excluded_fields:
                            try:
                                version_data[field_name] = getattr(current_version, field_name)
                            except AttributeError:
                                pass
            
            # Apply any new data from the request (overrides copied data)
            for key, value in validated_data.items():
                if key not in excluded_fields:
                    version_data[key] = value
            
            # Extra safety: remove any excluded fields that might have slipped through
            for field_name in list(version_data.keys()):
                if field_name in excluded_fields:
                    del version_data[field_name]
            
            # =================================================================
            # CREATE FULL COMPANY SNAPSHOT
            # =================================================================
            
            # Company Information Snapshot
            company_data_snapshot = {
                'company_name': company.company_name,
                'address_1': company.address_1,
                'address_2': company.address_2,
                'address_3': company.address_3,
                'address_4': company.address_4,
                'region': company.region,
                'country': company.country,
                'geographical_coverage': company.geographical_coverage,
                'phone_number': company.phone_number,
                'company_email': company.company_email,
                'website': company.website,
                'accreditation': company.accreditation,
                'parent_company': company.parent_company,
                'status': company.status,
                'unique_key': company.unique_key,
            }
            
            # Contact Information Snapshot
            contact_data_snapshot = {}
            for i in range(1, 5):
                contact_data_snapshot[f'title_{i}'] = getattr(company, f'title_{i}', '')
                contact_data_snapshot[f'initials_{i}'] = getattr(company, f'initials_{i}', '')
                contact_data_snapshot[f'surname_{i}'] = getattr(company, f'surname_{i}', '')
                contact_data_snapshot[f'position_{i}'] = getattr(company, f'position_{i}', '')
            
            # Notes Snapshot
            notes_snapshot = []
            for note in company.notes.all():
                notes_snapshot.append({
                    'note_id': str(note.note_id),
                    'note_type': note.note_type,
                    'content': note.content,
                    'created_at': note.created_at.isoformat() if note.created_at else None,
                    'created_by': note.created_by.username if note.created_by else None,
                    'is_pinned': note.is_pinned,
                })
            
            # =================================================================
            # CREATE TECHNICAL DATA SNAPSHOT
            # This captures all technical fields at this moment in time
            # =================================================================
            technical_data_snapshot = {}
            for field_name, value in version_data.items():
                # Store all technical field values in the snapshot
                technical_data_snapshot[field_name] = value
            
            # Create new version with snapshots
            # Snapshot versions have is_current=False (Initial Version keeps is_current=True)
            version = ProductionSiteVersion.objects.create(
                production_site=production_site,
                version_number=version_number,
                is_current=False,  # Snapshots are not "current" - Initial Version holds live data
                is_active=True,
                created_by=user,
                company_data_snapshot=company_data_snapshot,
                contact_data_snapshot=contact_data_snapshot,
                notes_snapshot=notes_snapshot,
                technical_data_snapshot=technical_data_snapshot,
                **version_data
            )
            
            return version


# =============================================================================
# PRODUCTION SITE SERIALIZERS
# =============================================================================

class ProductionSiteListSerializer(serializers.ModelSerializer):
    """List serializer for production sites"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    current_version = ProductionSiteVersionListSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    version_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ProductionSite
        fields = [
            'site_id', 'category', 'category_display',
            'source_project_code',  # NEW: Project code from transfer
            'created_at', 'is_active', 'version_count',
            'current_version'
        ]
        read_only_fields = fields


class ProductionSiteWithVersionDataSerializer(serializers.ModelSerializer):
    """
    Production site serializer that includes FULL version data.
    Used in company detail modal to show technical fields.
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    current_version = ProductionSiteVersionFullSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    version_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ProductionSite
        fields = [
            'site_id', 'category', 'category_display',
            'source_project_code',  # NEW: Project code from transfer
            'created_at', 'is_active', 'version_count',
            'current_version'
        ]
        read_only_fields = fields


class ProductionSiteDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for production sites"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    current_version = ProductionSiteVersionDetailSerializer(read_only=True)
    versions = ProductionSiteVersionListSerializer(many=True, read_only=True)
    notes = CompanyNoteSerializer(many=True, read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    version_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ProductionSite
        fields = [
            'site_id', 'company', 'category', 'category_display',
            'source_project_code', 
            'created_at', 'updated_at', 'created_by',
            'is_active', 'version_count',
            'current_version', 'versions', 'notes'
        ]
        read_only_fields = fields


# =============================================================================
# COMPANY SERIALIZERS
# =============================================================================

class CompanyListSerializer(serializers.ModelSerializer):
    """List serializer for companies (optimized for list views)"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    active_categories = serializers.ListField(read_only=True)
    all_categories = serializers.ListField(read_only=True)
    production_site_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'company_id', 'unique_key', 'company_name',
            'country', 'region', 'status', 'status_display',
            'project_code',
            'all_categories', 'active_categories',
            'production_site_count',
            'phone_number', 'website',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_production_site_count(self, obj):
        return obj.production_sites.count()


class CompanyDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for companies (full data including technical fields)"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    # Use the new serializer that includes full version data
    production_sites = ProductionSiteWithVersionDataSerializer(many=True, read_only=True)
    notes = CompanyNoteSerializer(many=True, read_only=True)
    history = serializers.SerializerMethodField()
    active_categories = serializers.ListField(read_only=True)
    all_categories = serializers.ListField(read_only=True)
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    last_modified_by_info = UserBasicSerializer(source='last_modified_by', read_only=True)
    
    class Meta:
        model = Company
        fields = [
            # Identification
            'company_id', 'unique_key', 'company_name',
            'status', 'status_display',
            
            # Address
            'address_1', 'address_2', 'address_3', 'address_4',
            'region', 'country', 'geographical_coverage',
            
            # Contact
            'phone_number', 'company_email', 'website',
            'accreditation', 'parent_company',
            
            # Contact Persons
            'title_1', 'initials_1', 'surname_1', 'position_1',
            'title_2', 'initials_2', 'surname_2', 'position_2',
            'title_3', 'initials_3', 'surname_3', 'position_3',
            'title_4', 'initials_4', 'surname_4', 'position_4',
            
            # GDPR
            'hide_contact_persons',
            
            # Source tracking
            'project_code', 'source_project', 'legacy_factory_ids',
            
            # Categories
            'all_categories', 'active_categories',
            
            # Related objects
            'production_sites', 'notes', 'history',
            
            # Audit
            'created_at', 'updated_at',
            'created_by', 'created_by_info',
            'last_modified_by', 'last_modified_by_info'
        ]
        read_only_fields = [
            'company_id', 'unique_key', 'company_name_normalized',
            'created_at', 'updated_at', 'created_by', 'last_modified_by',
            'legacy_factory_ids'
        ]
    
    def get_history(self, obj):
        # Limit to recent history
        history = obj.history.all()[:20]
        return CompanyHistorySerializer(history, many=True).data


class CompanyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating companies"""
    
    class Meta:
        model = Company
        fields = [
            'company_name', 'status',
            'address_1', 'address_2', 'address_3', 'address_4',
            'region', 'country', 'geographical_coverage',
            'phone_number', 'company_email', 'website',
            'accreditation', 'parent_company',
            'title_1', 'initials_1', 'surname_1', 'position_1',
            'title_2', 'initials_2', 'surname_2', 'position_2',
            'title_3', 'initials_3', 'surname_3', 'position_3',
            'title_4', 'initials_4', 'surname_4', 'position_4',
            'hide_contact_persons',
            'project_code', 'source_project'
        ]
    
    def validate_company_name(self, value):
        """Check for duplicates"""
        from .services.duplicate_check import DuplicateCheckService
        
        result = DuplicateCheckService.check_duplicate(value)
        
        if result['is_duplicate']:
            raise serializers.ValidationError(
                f"A company with this name already exists: {result['exact_match'].unique_key}"
            )
        
        # Store similar matches for warning (not error)
        if result['similar_matches']:
            self.context['similar_companies'] = result['similar_matches']
        
        return value
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        validated_data['last_modified_by'] = self.context['request'].user
        
        company = Company.objects.create(**validated_data)
        
        # Create history entry
        CompanyHistory.objects.create(
            company=company,
            action='CREATED',
            performed_by=self.context['request'].user,
            description=f"Company created: {company.company_name}"
        )
        
        return company


class CompanyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating companies"""
    
    class Meta:
        model = Company
        fields = [
            'company_name', 'status',
            'address_1', 'address_2', 'address_3', 'address_4',
            'region', 'country', 'geographical_coverage',
            'phone_number', 'company_email', 'website',
            'accreditation', 'parent_company',
            'title_1', 'initials_1', 'surname_1', 'position_1',
            'title_2', 'initials_2', 'surname_2', 'position_2',
            'title_3', 'initials_3', 'surname_3', 'position_3',
            'title_4', 'initials_4', 'surname_4', 'position_4',
            'hide_contact_persons',
            'project_code'
        ]
    
    def validate_company_name(self, value):
        """Check for duplicates (excluding current company) - only if name changed"""
        from .services.duplicate_check import DuplicateCheckService
        import logging
        logger = logging.getLogger(__name__)
        
        # Get the exclude_id from instance if available
        exclude_id = None
        if self.instance:
            exclude_id = self.instance.company_id
            
            # If name hasn't changed, skip duplicate check
            if self.instance.company_name == value:
                logger.info(f"Company name unchanged for {exclude_id}, skipping duplicate check")
                return value
            
            logger.info(f"Updating company {exclude_id}, name changed from '{self.instance.company_name}' to '{value}'")
        else:
            logger.info(f"No instance set, checking for duplicate name: {value}")
        
        result = DuplicateCheckService.check_duplicate(
            value, 
            exclude_id=exclude_id
        )
        
        if result['is_duplicate']:
            logger.warning(f"Duplicate found: {result['exact_match'].unique_key}")
            raise serializers.ValidationError(
                f"A company with this name already exists: {result['exact_match'].unique_key}"
            )
        
        return value
    
    def update(self, instance, validated_data):
        # Track changes
        changes = {}
        for field, new_value in validated_data.items():
            old_value = getattr(instance, field)
            if old_value != new_value:
                changes[field] = {'old': str(old_value), 'new': str(new_value)}
        
        # Update instance
        for field, value in validated_data.items():
            setattr(instance, field, value)
        
        instance.last_modified_by = self.context['request'].user
        instance.save()
        
        # Create history entry if there were changes
        if changes:
            CompanyHistory.objects.create(
                company=instance,
                action='UPDATED',
                performed_by=self.context['request'].user,
                description=f"Company updated: {len(changes)} field(s) changed",
                changes=changes
            )
        
        return instance


# =============================================================================
# DUPLICATE CHECK SERIALIZERS
# =============================================================================

class DuplicateCheckSerializer(serializers.Serializer):
    """Serializer for duplicate check requests"""
    company_name = serializers.CharField(required=True, max_length=255)
    country = serializers.CharField(required=False, allow_blank=True, max_length=100)
    exclude_id = serializers.UUIDField(required=False, allow_null=True)


class DuplicateCheckResponseSerializer(serializers.Serializer):
    """Serializer for duplicate check responses"""
    is_duplicate = serializers.BooleanField()
    exact_match = serializers.SerializerMethodField()
    similar_matches = serializers.ListField()
    
    def get_exact_match(self, obj):
        if obj.get('exact_match'):
            return CompanyListSerializer(obj['exact_match']).data
        return None


# =============================================================================
# BULK OPERATION SERIALIZERS
# =============================================================================

class BulkStatusUpdateSerializer(serializers.Serializer):
    """Serializer for bulk status updates"""
    company_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    status = serializers.ChoiceField(choices=CompanyStatus.choices)


class AddProductionSiteSerializer(serializers.Serializer):
    """Serializer for adding production site to company"""
    category = serializers.ChoiceField(choices=CompanyCategory.choices)
    
    # All the version fields can be passed optionally
    custom = serializers.BooleanField(required=False, default=False)
    proprietary_products = serializers.BooleanField(required=False, default=False)
    in_house = serializers.BooleanField(required=False, default=False)
    # ... (other fields would be added here)
    
    def validate_category(self, value):
        """Check if category already exists for this company"""
        company = self.context['company']
        if company.production_sites.filter(category=value).exists():
            raise serializers.ValidationError(
                f"Company already has a {value} production site"
            )
        return value


# =============================================================================
# SEARCH & FILTER SERIALIZERS
# =============================================================================

class CompanySearchSerializer(serializers.Serializer):
    """Serializer for company search parameters"""
    search = serializers.CharField(required=False, allow_blank=True)
    status = serializers.MultipleChoiceField(
        choices=CompanyStatus.choices,
        required=False
    )
    country = serializers.CharField(required=False, allow_blank=True)
    category = serializers.MultipleChoiceField(
        choices=CompanyCategory.choices,
        required=False
    )
    has_active_production = serializers.BooleanField(required=False)
    ordering = serializers.ChoiceField(
        choices=[
            'company_name', '-company_name',
            'created_at', '-created_at',
            'updated_at', '-updated_at',
            'country', '-country'
        ],
        required=False,
        default='-updated_at'
    )
