# reports/import_export_serializers.py
"""
Serializers for bulk import/export operations
Uses field definitions from fields.py to dynamically build exports
FIXED: Boolean fields export as 1/0, not Yes/No
"""

from rest_framework import serializers
from .models import UnverifiedSite, DataCollectionProject
from django.contrib.auth import get_user_model
from .fields import (
    COMMON_FIELDS,
    CONTACT_FIELDS,
    INJECTION_FIELDS,
    BLOW_FIELDS,
    ROTO_FIELDS,
    PE_FILM_FIELDS,
    SHEET_FIELDS,
    PIPE_FIELDS,
    TUBE_HOSE_FIELDS,
    PROFILE_FIELDS,
    CABLE_FIELDS,
    COMPOUNDER_FIELDS
)

User = get_user_model()


def get_category_fields(category):
    """
    Get the list of field names for a specific category
    Returns: List of field names in order (common + contact + category-specific)
    """
    CATEGORY_FIELD_MAP = {
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
    }
    
    category_specific_fields = CATEGORY_FIELD_MAP.get(category, [])
    
    # Return fields in order: Common -> Contact -> Category-specific
    return COMMON_FIELDS + CONTACT_FIELDS + category_specific_fields


class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    """
    A ModelSerializer that takes an additional `fields` argument to
    dynamically set the fields to serialize
    """
    def __init__(self, *args, **kwargs):
        # Get fields from kwargs
        fields = kwargs.pop('fields', None)
        
        # Instantiate the superclass normally
        super().__init__(*args, **kwargs)
        
        if fields is not None:
            # Drop any fields that are not specified in the `fields` argument
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)


class SiteExportSerializer(DynamicFieldsModelSerializer):
    """
    Serializer for exporting sites to Excel
    Dynamically includes only the fields relevant to the site's category
    FIXED: Boolean values export as 1/0, not Yes/No
    """
    
    class Meta:
        model = UnverifiedSite
        fields = '__all__'  # We'll filter this dynamically
    
    def to_representation(self, instance):
        """
        Override to use verbose names as keys and handle boolean/empty fields
        """
        ret = super().to_representation(instance)
        
        # Create new dict with verbose names as keys
        verbose_ret = {}
        for field_name, value in ret.items():
            try:
                field = self.Meta.model._meta.get_field(field_name)
                # Use verbose_name as the key
                verbose_name = str(field.verbose_name)
                
                # FIXED: Convert boolean values to 1/0/blank for Excel
                if isinstance(value, bool):
                    if value is True:
                        value = 1  # True = 1
                    elif value is False:
                        value = 0  # False = 0
                elif value is None or value == '':
                    # Empty fields should be blank (not "nan" or "None")
                    value = ''
                
                verbose_ret[verbose_name] = value
            except:
                # If field doesn't exist in model, use field_name as is
                if value is None or value == '':
                    value = ''
                verbose_ret[field_name] = value
        
        return verbose_ret


class SiteImportSerializer(serializers.Serializer):
    """Serializer for validating imported site data"""
    
    # Required fields
    company_name = serializers.CharField(max_length=255, required=True)
    country = serializers.CharField(max_length=100, required=True)
    category = serializers.ChoiceField(
        choices=['INJECTION', 'BLOW', 'ROTO', 'PE_FILM', 'SHEET', 'PIPE', 'TUBE_HOSE', 'PROFILE', 'CABLE', 'COMPOUNDER'],
        required=True
    )
    
    # All other fields are optional and will be validated dynamically
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add all possible fields as optional
        all_possible_fields = set()
        all_possible_fields.update(COMMON_FIELDS)
        all_possible_fields.update(CONTACT_FIELDS)
        all_possible_fields.update(INJECTION_FIELDS)
        all_possible_fields.update(BLOW_FIELDS)
        all_possible_fields.update(ROTO_FIELDS)
        all_possible_fields.update(PE_FILM_FIELDS)
        all_possible_fields.update(SHEET_FIELDS)
        all_possible_fields.update(PIPE_FIELDS)
        all_possible_fields.update(TUBE_HOSE_FIELDS)
        all_possible_fields.update(PROFILE_FIELDS)
        all_possible_fields.update(CABLE_FIELDS)
        all_possible_fields.update(COMPOUNDER_FIELDS)
        
        # Add these fields dynamically
        for field_name in all_possible_fields:
            if field_name not in ['company_name', 'country', 'category']:
                self.fields[field_name] = serializers.CharField(
                    required=False, 
                    allow_blank=True,
                    allow_null=True
                )


class ImportPreviewSerializer(serializers.Serializer):
    """Serializer for import preview response"""
    
    total_rows = serializers.IntegerField()
    valid_rows = serializers.IntegerField()
    invalid_rows = serializers.IntegerField()
    errors = serializers.ListField()
    preview_data = serializers.ListField()
    warnings = serializers.ListField(required=False)