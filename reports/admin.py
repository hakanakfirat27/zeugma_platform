# reports/admin.py

from django.contrib import admin
from .models import SuperdatabaseRecord, CustomReport, Subscription
# Import our organized field lists from the new fields.py file
from .fields import (
    COMMON_FIELDS, CONTACT_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
    PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS,
    CABLE_FIELDS, COMPOUNDER_FIELDS
)


@admin.register(SuperdatabaseRecord)
class SuperdatabaseRecordAdmin(admin.ModelAdmin):
    class Media:
        js = ('admin/js/category_filter.js',)

    def get_fieldsets(self, request, obj=None):
        fieldsets = [
            ('Core Information', {'fields': ('category', *COMMON_FIELDS)}),
            ('Contact Persons', {'fields': CONTACT_FIELDS, 'classes': ('collapse',)})
        ]
        if obj is None:
            return fieldsets

        category_map = {
            'INJECTION': ('Injection Moulder Details', INJECTION_FIELDS),
            'BLOW': ('Blow Moulder Details', BLOW_FIELDS),
            'ROTO': ('Roto Moulder Details', ROTO_FIELDS),
            'PE_FILM': ('PE Film Extruder Details', PE_FILM_FIELDS),
            'SHEET': ('Sheet Extruder Details', SHEET_FIELDS),
            'PIPE': ('Pipe Extruder Details', PIPE_FIELDS),
            'TUBE_HOSE': ('Tube & Hose Extruder Details', TUBE_HOSE_FIELDS),
            'PROFILE': ('Profile Extruder Details', PROFILE_FIELDS),
            'CABLE': ('Cable Extruder Details', CABLE_FIELDS),
            'COMPOUNDER': ('Compounder Details', COMPOUNDER_FIELDS),
        }

        if obj.category in category_map:
            title, fields = category_map[obj.category]
            fieldsets.append((title, {'fields': fields, 'classes': ('collapse',)}))

        return fieldsets

    list_display = ('company_name', 'category', 'country', 'last_updated')

    # --- THIS IS THE LINE WE ARE CHANGING ---
    # We've added more fields to allow for powerful filtering.
    list_filter = ('category', 'country', 'in_house', 'pvc', 'abs', 'automotive', 'medical')

    search_fields = ('company_name', 'country', 'website')


@admin.register(CustomReport)
class CustomReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'is_featured', 'monthly_price', 'annual_price', 'record_count', 'created_at']
    list_filter = ['is_active', 'is_featured', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['report_id', 'record_count', 'created_at', 'updated_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['client', 'report', 'plan', 'status', 'start_date', 'end_date', 'is_active']
    list_filter = ['status', 'plan', 'start_date', 'end_date']
    search_fields = ['client__username', 'client__email', 'report__title']
    readonly_fields = ['subscription_id', 'created_at', 'updated_at']

