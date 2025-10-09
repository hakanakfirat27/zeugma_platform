from rest_framework import serializers
from .models import SuperdatabaseRecord
from .fields import (
    COMMON_FIELDS, CONTACT_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
    PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS,
    CABLE_FIELDS, COMPOUNDER_FIELDS
)


class SuperdatabaseRecordSerializer(serializers.ModelSerializer):
    display_fields = serializers.SerializerMethodField()
    # --- NEW: This field will provide a map of field names to their correct labels ---
    field_labels = serializers.SerializerMethodField()

    class Meta:
        model = SuperdatabaseRecord
        fields = '__all__'

    def get_display_fields(self, obj):
        category_field_map = {
            'INJECTION': INJECTION_FIELDS, 'BLOW': BLOW_FIELDS, 'ROTO': ROTO_FIELDS,
            'PE_FILM': PE_FILM_FIELDS, 'SHEET': SHEET_FIELDS, 'PIPE': PIPE_FIELDS,
            'TUBE_HOSE': TUBE_HOSE_FIELDS, 'PROFILE': PROFILE_FIELDS, 'CABLE': CABLE_FIELDS,
            'COMPOUNDER': COMPOUNDER_FIELDS,
        }
        category_specific_fields = category_field_map.get(obj.category, [])
        return COMMON_FIELDS + CONTACT_FIELDS + category_specific_fields

    def get_field_labels(self, obj):
        """
        This method creates a dictionary mapping each field name to its
        human-readable verbose_name from the Django model.
        """
        return {
            field.name: field.verbose_name
            for field in obj._meta.fields
        }