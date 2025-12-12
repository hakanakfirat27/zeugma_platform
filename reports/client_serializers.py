# backend/reports/client_serializers.py
"""
Client Report Record Serializer for Company Database Architecture

Uses the new Company Database models from reports.company_models
"""

from rest_framework import serializers
from reports.company_models import Company, ProductionSite, ProductionSiteVersion


class ClientReportRecordSerializer(serializers.Serializer):
    """
    Serializer for Client Report View that flattens Company + ProductionSite data
    into a single record format compatible with the frontend table.
    
    This serializer:
    1. Takes a ProductionSite instance as input
    2. Returns Company-level fields (company_name, address, contacts)
    3. Returns ProductionSite category
    4. Returns ALL technical fields from ProductionSiteVersion (current_version)
    
    Structure matches CompanyDetailPage expectations.
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
    category = serializers.CharField(read_only=True)  # Direct category field for exports
    categories = serializers.SerializerMethodField()  # Array format for frontend table
    status = serializers.CharField(source='company.status', read_only=True)
    
    def to_representation(self, instance):
        """
        Override to_representation to dynamically add ALL technical fields
        from the production site's current version.
        
        This ensures all technical fields (ps, pp, hdpe, custom, etc.) are included
        in the API response without having to list them explicitly.
        
        Args:
            instance: ProductionSite object with current_version
        
        Returns:
            dict: Complete serialized data including all technical fields
        """
        # Get base representation (company fields + contacts)
        data = super().to_representation(instance)
        
        # Add ALL technical fields from current_version
        if hasattr(instance, 'current_version') and instance.current_version:
            version = instance.current_version
            version_data = version.__dict__
            
            # Fields to exclude (Django internal fields and foreign keys)
            excluded_fields = {
                '_state', 'id', 'version_id', 'production_site', 'production_site_id',
                'version_number', 'created_at', 'updated_at', 'is_active', 'is_current',
                'created_by', 'created_by_id', 'company', 'company_id',
                'verified_at', 'verified_by', 'verified_by_id', 'version_notes',
                'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
                'technical_data_snapshot', 'is_initial'
            }
            
            # Add all technical fields from the version
            for field_name, value in version_data.items():
                if field_name not in excluded_fields:
                    data[field_name] = value
        
        return data
    
    def get_id(self, obj):
        """Use production site ID as the record ID"""
        # Use site_id (UUID) if available, otherwise fall back to pk
        if hasattr(obj, 'site_id'):
            return str(obj.site_id)
        return str(obj.id)
    
    def get_factory_id(self, obj):
        """Use production site ID as factory_id for backward compatibility"""
        # Use site_id (UUID) if available, otherwise fall back to pk
        if hasattr(obj, 'site_id'):
            return str(obj.site_id)
        return str(obj.id)
    
    def get_categories(self, obj):
        """
        Return category as an array for frontend compatibility.
        
        Frontend expects: categories = ["INJECTION"]
        Backend has: category = "INJECTION"
        """
        if obj.category:
            return [obj.category]
        return []