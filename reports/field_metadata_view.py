# reports/field_metadata_view.py

"""
API endpoint to expose field metadata from Django models
This eliminates the need to duplicate field types and labels in the frontend
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models as django_models
from .models import SuperdatabaseRecord, UnverifiedSite
from .fields import (
    INJECTION_FIELDS,
    BLOW_FIELDS,
    ROTO_FIELDS,
    PE_FILM_FIELDS,
    SHEET_FIELDS,
    PIPE_FIELDS,
    TUBE_HOSE_FIELDS,
    PROFILE_FIELDS,
    CABLE_FIELDS,
    COMPOUNDER_FIELDS,
    RECYCLER_FIELDS,
    COMMON_FIELDS,
    CONTACT_FIELDS
)


def get_field_metadata(model_class, field_name):
    """
    Extract field metadata from Django model
    Returns: {
        'name': field_name,
        'label': verbose_name (exactly as defined in Django),
        'type': 'checkbox'|'text'|'number'|'email'|'url'|'textarea',
        'required': bool,
        'max_length': int (for char fields),
    }
    """
    try:
        field = model_class._meta.get_field(field_name)
        
        # Get verbose name EXACTLY as defined in Django - don't modify capitalization!
        label = str(field.verbose_name) if field.verbose_name else field_name.replace('_', ' ')
        
        # Determine field type
        field_type = 'text'  # default
        max_length = None
        
        if isinstance(field, django_models.BooleanField):
            field_type = 'checkbox'
        elif isinstance(field, (django_models.IntegerField, django_models.PositiveIntegerField, 
                                  django_models.SmallIntegerField, django_models.BigIntegerField)):
            field_type = 'number'
        elif isinstance(field, (django_models.FloatField, django_models.DecimalField)):
            field_type = 'number'  # Also number, but allows decimals
        elif isinstance(field, django_models.EmailField):
            field_type = 'email'
        elif isinstance(field, django_models.URLField):
            field_type = 'url'
        elif isinstance(field, django_models.TextField):
            field_type = 'textarea'
        elif isinstance(field, django_models.CharField):
            field_type = 'text'
            max_length = field.max_length
        
        # Check if required
        required = not field.blank and not field.null and field.default == django_models.NOT_PROVIDED
        
        return {
            'name': field_name,
            'label': label,
            'type': field_type,
            'required': required,
            'max_length': max_length,
        }
    except Exception as e:
        # If field doesn't exist in model, return basic metadata
        return {
            'name': field_name,
            'label': field_name.replace('_', ' '),
            'type': 'text',
            'required': False,
        }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_field_metadata_api(request):
    """
    GET /api/fields/metadata/
    
    Returns field metadata for all categories including:
    - Field names
    - Verbose names (labels) - EXACTLY as defined in Django models
    - Field types (checkbox, text, number, etc.)
    - Required status
    
    This allows the frontend to dynamically render forms without
    hardcoding field types and labels.
    """
    
    # Use UnverifiedSite model as the source of truth
    model = UnverifiedSite
    
    # Build metadata for each category
    metadata = {
        'COMMON_FIELDS': [get_field_metadata(model, field) for field in COMMON_FIELDS],
        'CONTACT_FIELDS': [get_field_metadata(model, field) for field in CONTACT_FIELDS],
        'INJECTION': [get_field_metadata(model, field) for field in INJECTION_FIELDS],
        'BLOW': [get_field_metadata(model, field) for field in BLOW_FIELDS],
        'ROTO': [get_field_metadata(model, field) for field in ROTO_FIELDS],
        'PE_FILM': [get_field_metadata(model, field) for field in PE_FILM_FIELDS],
        'SHEET': [get_field_metadata(model, field) for field in SHEET_FIELDS],
        'PIPE': [get_field_metadata(model, field) for field in PIPE_FIELDS],
        'TUBE_HOSE': [get_field_metadata(model, field) for field in TUBE_HOSE_FIELDS],
        'PROFILE': [get_field_metadata(model, field) for field in PROFILE_FIELDS],
        'CABLE': [get_field_metadata(model, field) for field in CABLE_FIELDS],
        'COMPOUNDER': [get_field_metadata(model, field) for field in COMPOUNDER_FIELDS],
        'RECYCLER': [get_field_metadata(model, field) for field in RECYCLER_FIELDS],
    }
    
    return Response(metadata)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_category_fields_api(request, category):
    """
    GET /api/fields/metadata/{category}/
    
    Returns field metadata for a specific category only.
    More efficient when you only need one category.
    """
    
    category = category.upper()
    model = UnverifiedSite
    
    # Map category to field list
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
    
    if category not in category_field_map:
        return Response({'error': 'Invalid category'}, status=400)
    
    fields = category_field_map[category]
    
    metadata = {
        'common_fields': [get_field_metadata(model, field) for field in COMMON_FIELDS],
        'contact_fields': [get_field_metadata(model, field) for field in CONTACT_FIELDS],
        'category_fields': [get_field_metadata(model, field) for field in fields],
        'category': category,
    }
    
    return Response(metadata)