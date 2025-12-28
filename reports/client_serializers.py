# backend/reports/client_serializers.py
"""
Client Report Record Serializer for Company Database Architecture

Uses the new Company Database models from reports.company_models

OPTIMIZED VERSION:
- ClientReportRecordListSerializer: For Focus View and table views - includes ALL fields
- Uses prefetched data to avoid N+1 queries
"""

from rest_framework import serializers
from reports.company_models import Company, ProductionSite, ProductionSiteVersion


class ClientReportRecordListSerializer(serializers.Serializer):
    """
    Serializer for Client Report View that flattens Company + ProductionSite data
    into a single record format compatible with the frontend table.
    
    This serializer:
    1. Takes a ProductionSite instance as input
    2. Returns Company-level fields (company_name, address, contacts)
    3. Returns ProductionSite category
    4. Returns ALL technical fields from ProductionSiteVersion (current_version)
    
    OPTIMIZED: Uses prefetched data to avoid N+1 queries while still
    returning all fields needed for Focus View and detail modals.
    """
    
    # Primary identifiers
    id = serializers.SerializerMethodField()
    factory_id = serializers.SerializerMethodField()
    
    # Company Information fields
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    address_1 = serializers.CharField(source='company.address_1', allow_blank=True, default='')
    address_2 = serializers.CharField(source='company.address_2', allow_blank=True, default='')
    address_3 = serializers.CharField(source='company.address_3', allow_blank=True, default='')
    address_4 = serializers.CharField(source='company.address_4', allow_blank=True, default='')
    region = serializers.CharField(source='company.region', allow_blank=True, default='')
    country = serializers.CharField(source='company.country', allow_blank=True, default='')
    geographical_coverage = serializers.CharField(source='company.geographical_coverage', allow_blank=True, default='')
    phone_number = serializers.CharField(source='company.phone_number', allow_blank=True, default='')
    company_email = serializers.EmailField(source='company.company_email', allow_blank=True, default='')
    website = serializers.CharField(source='company.website', allow_blank=True, default='')
    accreditation = serializers.CharField(source='company.accreditation', allow_blank=True, default='')
    parent_company = serializers.CharField(source='company.parent_company', allow_blank=True, default='')
    
    # Contact Person fields (all 4 contact persons)
    title_1 = serializers.CharField(source='company.title_1', allow_blank=True, default='')
    initials_1 = serializers.CharField(source='company.initials_1', allow_blank=True, default='')
    surname_1 = serializers.CharField(source='company.surname_1', allow_blank=True, default='')
    position_1 = serializers.CharField(source='company.position_1', allow_blank=True, default='')
    
    title_2 = serializers.CharField(source='company.title_2', allow_blank=True, default='')
    initials_2 = serializers.CharField(source='company.initials_2', allow_blank=True, default='')
    surname_2 = serializers.CharField(source='company.surname_2', allow_blank=True, default='')
    position_2 = serializers.CharField(source='company.position_2', allow_blank=True, default='')
    
    title_3 = serializers.CharField(source='company.title_3', allow_blank=True, default='')
    initials_3 = serializers.CharField(source='company.initials_3', allow_blank=True, default='')
    surname_3 = serializers.CharField(source='company.surname_3', allow_blank=True, default='')
    position_3 = serializers.CharField(source='company.position_3', allow_blank=True, default='')
    
    title_4 = serializers.CharField(source='company.title_4', allow_blank=True, default='')
    initials_4 = serializers.CharField(source='company.initials_4', allow_blank=True, default='')
    surname_4 = serializers.CharField(source='company.surname_4', allow_blank=True, default='')
    position_4 = serializers.CharField(source='company.position_4', allow_blank=True, default='')
    
    # Frontend compatibility fields
    category = serializers.CharField(read_only=True)
    categories = serializers.SerializerMethodField()
    status = serializers.CharField(source='company.status', read_only=True)
    
    def _get_current_version(self, obj):
        """Get current version from prefetched data or query"""
        # Try prefetched_current_version first (set by optimized queryset)
        if hasattr(obj, 'prefetched_current_version') and obj.prefetched_current_version:
            return obj.prefetched_current_version[0] if obj.prefetched_current_version else None
        # Try prefetched versions cache
        if hasattr(obj, '_prefetched_objects_cache') and 'versions' in obj._prefetched_objects_cache:
            for v in obj._prefetched_objects_cache['versions']:
                if v.is_current:
                    return v
            return None
        # Fallback to property (will cause extra query if not prefetched)
        return obj.current_version
    
    def to_representation(self, instance):
        """
        Override to_representation to dynamically add ALL technical fields
        from the production site's current version.
        
        This ensures all technical fields (ps, pp, hdpe, custom, etc.) are included
        in the API response without having to list them explicitly.
        """
        # Get base representation (company fields + contacts)
        data = super().to_representation(instance)
        
        # Add ALL technical fields from current_version
        version = self._get_current_version(instance)
        if version:
            # Fields to exclude (Django internal fields and foreign keys)
            excluded_fields = {
                '_state', 'id', 'version_id', 'production_site', 'production_site_id',
                'version_number', 'created_at', 'updated_at', 'is_active', 'is_current',
                'created_by', 'created_by_id', 'company', 'company_id',
                'verified_at', 'verified_by', 'verified_by_id', 'version_notes',
                'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
                'technical_data_snapshot', 'is_initial'
            }
            
            # Iterate through model fields explicitly to ensure all are included
            # Using _meta.fields ensures we get all defined fields, not just loaded ones
            for field in version._meta.fields:
                field_name = field.name
                if field_name not in excluded_fields:
                    # Use getattr to properly fetch the field value
                    data[field_name] = getattr(version, field_name, None)
        
        return data
    
    def get_id(self, obj):
        """Use production site ID as the record ID"""
        if hasattr(obj, 'site_id'):
            return str(obj.site_id)
        return str(obj.id)
    
    def get_factory_id(self, obj):
        """Use production site ID as factory_id for backward compatibility"""
        if hasattr(obj, 'site_id'):
            return str(obj.site_id)
        return str(obj.id)
    
    def get_categories(self, obj):
        """Return category as an array for frontend compatibility."""
        if obj.category:
            return [obj.category]
        return []


# Alias for backward compatibility
ClientReportRecordSerializer = ClientReportRecordListSerializer
