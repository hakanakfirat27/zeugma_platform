# reports/admin.py

from django.utils import timezone
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    SuperdatabaseRecord,
    CustomReport,
    Subscription,
    SavedSearch,
    ExportTemplate,
    UnverifiedSite,
    VerificationHistory,
    VerificationStatus,
    CompanyCategory,
    DataCollectionProject,
    ReviewNote,
    ProjectActivityLog,
    CallLog, 
    FieldConfirmation,
    HelpArticleFeedback
)

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
    COMPOUNDER_FIELDS,
    RECYCLER_FIELDS
)

from .company_models import (
    Company, ProductionSite, ProductionSiteVersion,
    CompanyNote, CompanyHistory
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
            'RECYCLER': ('Recycler Details', RECYCLER_FIELDS),
        }

        if obj.category in category_map:
            title, fields = category_map[obj.category]
            fieldsets.append((title, {'fields': fields, 'classes': ('collapse',)}))

        return fieldsets

    list_display = ('company_name', 'category', 'country', 'last_updated')

    # --- THIS IS THE LINE WE ARE CHANGING ---
    # We've added more fields to allow for powerful filtering.
    list_filter = ('category', 'country', 'in_house', 'pvc', 'abs', 'automotive', 'medical', 'pp')

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


@admin.register(ExportTemplate)
class ExportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'report', 'is_default', 'created_at']
    list_filter = ['is_default', 'created_at']
    search_fields = ['name', 'user__username', 'report__title']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'user', 'report')
        }),
        ('Settings', {
            'fields': ('selected_columns', 'is_default')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UnverifiedSite)
class UnverifiedSiteAdmin(admin.ModelAdmin):
    """
    Admin interface for managing unverified company sites.
    Uses the same structure as SuperdatabaseRecord for consistency.
    """
    
    def get_fieldsets(self, request, obj=None):
        """
        Dynamically generate fieldsets based on category.
        Matches the SuperdatabaseRecord admin structure exactly.
        """
        # Base fieldsets (always shown)
        fieldsets = [
            ('Core Information', {
                'fields': ('category', *COMMON_FIELDS)
            }),
            ('Contact Persons', {
                'fields': CONTACT_FIELDS,
                'classes': ('collapse',)
            })
        ]
        
        # If no object yet (creating new), return base fieldsets
        if obj is None:
            return fieldsets
        
        # Category-specific fieldsets (matches SuperdatabaseRecord exactly)
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
        
        # Add category-specific fields
        if obj.category in category_map:
            title, fields = category_map[obj.category]
            fieldsets.append((title, {
                'fields': fields,
                'classes': ('collapse',)
            }))
        
        # Add verification-specific fieldsets at the end
        fieldsets.extend([
            ('⚠️ Verification Info', {
                'fields': (
                    'verification_status',
                    'priority',
                    'source',
                    'data_quality_score',
                ),
                'classes': ('collapse',),
            }),
            ('👥 Assignment & Review', {
                'fields': (
                    'collected_by',
                    'assigned_to',
                    'verified_by',
                    'verified_date',
                ),
                'classes': ('collapse',),
            }),
            ('🚨 Duplicate Detection', {
                'fields': (
                    'is_duplicate',
                    'duplicate_of',
                    'duplicate_warning',
                ),
                'classes': ('collapse',),
            }),
            ('📝 Notes & Comments', {
                'fields': (
                    'notes',
                    'rejection_reason',
                ),
                'classes': ('collapse',),
            }),
            ('🕐 Timestamps', {
                'fields': (
                    'site_id',
                    'collected_date',
                    'updated_at',
                ),
                'classes': ('collapse',),
            }),
        ])
        
        return fieldsets
    
    # List view configuration
    list_display = [
        'company_name',
        'category',
        'country',
        'verification_status_badge',
        'priority_badge',
        'data_quality_badge',
        'source',
        'collected_by',
        'collected_date',
    ]
    
    list_filter = [
        'verification_status',
        'category',
        'country',
        'priority',
        'source',
        'is_duplicate',
        'collected_date',
    ]
    
    search_fields = [
        'company_name',
        'country',
        'company_email',
        'website',
        'notes',
    ]
    
    readonly_fields = [
        'site_id',
        'data_quality_score',
        'collected_date',
        'updated_at',
        'is_duplicate',
        'duplicate_of',
        'duplicate_warning',
    ]
    
    # Bulk actions
    actions = [
        'approve_sites',
        'reject_sites',
        'mark_under_review',
        'mark_high_priority',
        'mark_low_priority',
    ]
    
    # =========================================================================
    # CUSTOM DISPLAY METHODS (badges and warnings)
    # =========================================================================
    
    def verification_status_badge(self, obj):
        """Display verification status with color coding"""
        colors = {
            'PENDING': 'gray',
            'UNDER_REVIEW': 'blue',
            'APPROVED': 'green',
            'REJECTED': 'red',
        }
        color = colors.get(obj.verification_status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_verification_status_display()
        )
    verification_status_badge.short_description = 'Status'
    
    def priority_badge(self, obj):
        """Display priority with color coding"""
        colors = {
            'LOW': '#808080',
            'MEDIUM': '#FFA500',
            'HIGH': '#FF4500',
            'URGENT': '#DC143C',
        }
        color = colors.get(obj.priority, '#808080')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_priority_display()
        )
    priority_badge.short_description = 'Priority'
    
    def data_quality_badge(self, obj):
        """Display data quality score with color coding"""
        score = obj.data_quality_score
        if score >= 70:
            color = '#28a745'  # Green
            label = 'Good'
        elif score >= 40:
            color = '#ffc107'  # Yellow
            label = 'Fair'
        else:
            color = '#dc3545'  # Red
            label = 'Poor'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{} ({}%)</span>',
            color,
            label,
            score
        )
    data_quality_badge.short_description = 'Quality'
    
    def duplicate_warning(self, obj):
        """Show warning if duplicate detected"""
        if obj.is_duplicate and obj.duplicate_of:
            return format_html(
                '<div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px;">'
                '⚠️ <strong>Potential Duplicate Detected!</strong><br>'
                'This company may already exist in the database:<br>'
                '➤ <a href="/admin/reports/superdatabaserecord/{}/change/" target="_blank">{}</a><br>'
                'Category: {} | Country: {}'
                '</div>',
                obj.duplicate_of.factory_id,
                obj.duplicate_of.company_name,
                obj.duplicate_of.get_category_display(),
                obj.duplicate_of.country
            )
        return "No duplicates detected"
    duplicate_warning.short_description = 'Duplicate Status'
    
    # =========================================================================
    # BULK ACTIONS
    # =========================================================================
    
    def approve_sites(self, request, queryset):
        """Bulk approve selected unverified sites"""
        count = queryset.filter(verification_status='PENDING').update(
            verification_status='APPROVED',
            verified_by=request.user,
            verified_date=timezone.now()
        )
        self.message_user(request, f'{count} sites approved successfully.')
    approve_sites.short_description = "✅ Approve selected sites"
    
    def reject_sites(self, request, queryset):
        """Bulk reject selected unverified sites"""
        count = queryset.filter(verification_status='PENDING').update(
            verification_status='REJECTED',
            verified_by=request.user,
            verified_date=timezone.now()
        )
        self.message_user(request, f'{count} sites rejected.')
    reject_sites.short_description = "❌ Reject selected sites"
    
    def mark_under_review(self, request, queryset):
        """Mark sites as under review"""
        count = queryset.update(verification_status='UNDER_REVIEW')
        self.message_user(request, f'{count} sites marked for review.')
    mark_under_review.short_description = "🔍 Mark as under review"
    
    def mark_high_priority(self, request, queryset):
        """Mark selected sites as high priority"""
        count = queryset.update(priority='HIGH')
        self.message_user(request, f'{count} sites marked as high priority.')
    mark_high_priority.short_description = "⚡ Mark as HIGH priority"
    
    def mark_low_priority(self, request, queryset):
        """Mark selected sites as low priority"""
        count = queryset.update(priority='LOW')
        self.message_user(request, f'{count} sites marked as low priority.')
    mark_low_priority.short_description = "⬇️ Mark as LOW priority"


@admin.register(VerificationHistory)
class VerificationHistoryAdmin(admin.ModelAdmin):
    """
    Admin interface for tracking verification history.
    """
    list_display = [
        'site',
        'action',
        'performed_by',
        'timestamp'
    ]
    
    list_filter = [
        'action',
        'timestamp',
        'performed_by'
    ]
    
    search_fields = [
        'site__company_name',
        'notes'
    ]
    
    readonly_fields = [
        'history_id',
        'timestamp'
    ]
    
    fieldsets = (
        ('History Entry', {
            'fields': (
                'history_id',
                'site',
                'action',
                'performed_by',
                'timestamp',
            )
        }),
        ('Details', {
            'fields': (
                'old_data',
                'new_data',
                'notes',
            ),
            'classes': ('collapse',)
        }),
    )
    """
    Admin interface for tracking verification history.
    """
    list_display = [
        'site', 
        'action', 
        'performed_by', 
        'timestamp'
    ]
    
    list_filter = [
        'action', 
        'timestamp',
        'performed_by'
    ]
    
    search_fields = [
        'site__company_name', 
        'notes'
    ]
    
    readonly_fields = [
        'history_id',
        'timestamp'
    ]
    
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('History Entry', {
            'fields': (
                'history_id',
                'site',
                'action',
                'performed_by',
                'timestamp',
            )
        }),
        ('Details', {
            'fields': (
                'old_data',
                'new_data',
                'notes',
            )
        }),
    )


@admin.register(DataCollectionProject)
class DataCollectionProjectAdmin(admin.ModelAdmin):
    list_display = [
        'project_name', 
        'category', 
        'status', 
        'created_by', 
        'display_total_sites',  # ← Changed from 'total_sites'
        'created_at'
    ]
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['project_name', 'description', 'target_region']
    date_hierarchy = 'created_at'
    readonly_fields = ['project_id', 'created_at', 'updated_at']
    filter_horizontal = ['assigned_reviewers']
    
    @admin.display(description='Total Sites')
    def display_total_sites(self, obj):
        """Display total number of sites in this project"""
        return obj.get_total_sites()
    
    @admin.display(description='Pending')
    def display_pending_sites(self, obj):
        """Display number of pending sites"""
        return obj.get_pending_sites()
    
    @admin.display(description='Approved')
    def display_approved_sites(self, obj):
        """Display number of approved sites"""
        return obj.get_approved_sites()
    
    @admin.display(description='Completion %')
    def display_completion_percentage(self, obj):
        """Display completion percentage"""
        percentage = obj.get_completion_percentage()
        return f"{percentage}%"    


@admin.register(ReviewNote)
class ReviewNoteAdmin(admin.ModelAdmin):
    list_display = ['site', 'created_by', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['note_text', 'site__company_name']
    readonly_fields = ['note_id', 'created_at']


@admin.register(ProjectActivityLog)
class ProjectActivityLogAdmin(admin.ModelAdmin):
    list_display = ['project', 'action', 'performed_by', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['project__project_name', 'description']
    readonly_fields = ['log_id', 'timestamp']


@admin.register(CallLog)
class CallLogAdmin(admin.ModelAdmin):
    list_display = ['call_number', 'site', 'formatted_timestamp', 'call_notes', 'created_by']
    list_filter = ['call_timestamp', 'created_by']
    search_fields = ['site__company_name', 'call_notes']
    readonly_fields = ['call_id', 'created_at']
    date_hierarchy = 'call_timestamp'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('site', 'created_by')


@admin.register(FieldConfirmation)
class FieldConfirmationAdmin(admin.ModelAdmin):
    list_display = ['site', 'field_name', 'is_confirmed', 'is_new_data', 'is_pre_filled', 'confirmed_by']
    list_filter = ['is_confirmed', 'is_new_data', 'is_pre_filled', 'confirmed_at']
    search_fields = ['site__company_name', 'field_name']
    readonly_fields = ['confirmation_id', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('site', 'confirmed_by')    
    


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['unique_key', 'company_name', 'country', 'status', 'updated_at']
    list_filter = ['status', 'country']
    search_fields = ['company_name', 'unique_key']
    readonly_fields = ['company_id', 'unique_key', 'company_name_normalized', 
                       'created_at', 'updated_at', 'legacy_factory_ids']


@admin.register(ProductionSite)
class ProductionSiteAdmin(admin.ModelAdmin):
    list_display = ['company', 'category', 'is_active', 'version_count', 'created_at']
    list_filter = ['category']
    search_fields = ['company__company_name']


@admin.register(ProductionSiteVersion)
class ProductionSiteVersionAdmin(admin.ModelAdmin):
    list_display = ['production_site', 'version_number', 'is_current', 'is_active', 'created_at']
    list_filter = ['is_current', 'is_active']


@admin.register(CompanyNote)
class CompanyNoteAdmin(admin.ModelAdmin):
    list_display = ['company', 'note_type', 'created_by', 'created_at', 'is_pinned']
    list_filter = ['note_type', 'is_pinned']


@admin.register(CompanyHistory)
class CompanyHistoryAdmin(admin.ModelAdmin):
    list_display = ['company', 'action', 'performed_by', 'timestamp']
    list_filter = ['action']
    readonly_fields = ['history_id', 'timestamp', 'changes']


@admin.register(HelpArticleFeedback)
class HelpArticleFeedbackAdmin(admin.ModelAdmin):
    """Admin interface for viewing Help Center article feedback from clients."""
    list_display = ['user', 'article_id', 'is_helpful', 'created_at', 'updated_at']
    list_filter = ['is_helpful', 'article_id', 'created_at']
    search_fields = ['user__username', 'user__email', 'article_id', 'comment']
    readonly_fields = ['feedback_id', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Feedback Details', {
            'fields': ('feedback_id', 'user', 'article_id', 'is_helpful')
        }),
        ('Comment', {
            'fields': ('comment',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')    