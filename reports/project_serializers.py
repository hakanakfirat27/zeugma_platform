# reports/project_serializers.py

"""
Serializers for Project-based Unverified Sites Management
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    DataCollectionProject,
    ReviewNote,
    UnverifiedSite,
    ProjectActivityLog,
    VerificationStatus,
    ProjectStatus
)
from .fields import COMMON_FIELDS, CONTACT_FIELDS, ALL_COMMONS

User = get_user_model()


# ============================================================================
# USER SERIALIZERS
# ============================================================================

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for nested serialization"""
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'initials', 'role']
        read_only_fields = fields


# ============================================================================
# REVIEW NOTE SERIALIZERS
# ============================================================================

class ReviewNoteSerializer(serializers.ModelSerializer):
    """Serializer for review notes"""
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = ReviewNote
        fields = [
            'note_id',
            'site',
            'note_text',
            'created_by',
            'created_by_name',
            'created_by_info',
            'is_internal',
            'created_at',
            'attachment',
        ]
        read_only_fields = ['note_id', 'created_at']


class ReviewNoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating review notes"""
    
    class Meta:
        model = ReviewNote
        fields = ['site', 'note_text', 'is_internal', 'attachment']
    
    def validate_note_text(self, value):
        """Ensure note text is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Note text cannot be empty")
        return value.strip()


# ============================================================================
# PROJECT ACTIVITY LOG SERIALIZERS
# ============================================================================

class ProjectActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for project activity logs"""
    performed_by_info = UserBasicSerializer(source='performed_by', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = ProjectActivityLog
        fields = [
            'log_id',
            'project',
            'action',
            'action_display',
            'performed_by',
            'performed_by_info',
            'description',
            'timestamp',
        ]
        read_only_fields = fields


# ============================================================================
# PROJECT SERIALIZERS
# ============================================================================

class DataCollectionProjectListSerializer(serializers.ModelSerializer):
    """Serializer for listing projects (lightweight)"""
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    assigned_reviewers_info = UserBasicSerializer(source='assigned_reviewers', many=True, read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    # Computed fields
    total_sites = serializers.IntegerField(read_only=True)
    pending_sites = serializers.IntegerField(read_only=True)
    approved_sites = serializers.IntegerField(read_only=True)
    rejected_sites = serializers.IntegerField(read_only=True)
    under_review_sites = serializers.IntegerField(read_only=True)
    needs_revision_sites = serializers.IntegerField(read_only=True)
    completion_percentage = serializers.FloatField(read_only=True)
    approval_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = DataCollectionProject
        fields = [
            'project_id',
            'project_name',
            'description',
            'category',
            'category_display',
            'target_region',
            'status',
            'status_display',
            'created_by',
            'created_by_info',
            'assigned_reviewers',
            'assigned_reviewers_info',
            'target_count',
            'created_at',
            'updated_at',
            'completed_at',
            'deadline',
            # Computed fields
            'total_sites',
            'pending_sites',
            'approved_sites',
            'rejected_sites',
            'under_review_sites',
            'needs_revision_sites',
            'completion_percentage',
            'approval_rate',
        ]
        read_only_fields = [
            'project_id',
            'created_at',
            'updated_at',
            'completed_at',
        ]


class DataCollectionProjectDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed project view"""
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    assigned_reviewers_info = UserBasicSerializer(source='assigned_reviewers', many=True, read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    # Computed fields
    total_sites = serializers.IntegerField(read_only=True)
    pending_sites = serializers.IntegerField(read_only=True)
    approved_sites = serializers.IntegerField(read_only=True)
    rejected_sites = serializers.IntegerField(read_only=True)
    under_review_sites = serializers.IntegerField(read_only=True)
    needs_revision_sites = serializers.IntegerField(read_only=True)
    completion_percentage = serializers.FloatField(read_only=True)
    approval_rate = serializers.FloatField(read_only=True)
    
    # Recent activity
    recent_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = DataCollectionProject
        fields = '__all__'
        read_only_fields = [
            'project_id',
            'created_at',
            'updated_at',
            'completed_at',
        ]
    
    def get_recent_activity(self, obj):
        """Get 10 most recent activity logs"""
        logs = obj.activity_logs.all()[:10]
        return ProjectActivityLogSerializer(logs, many=True).data


class DataCollectionProjectCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating projects"""
    
    class Meta:
        model = DataCollectionProject
        fields = [
            'project_name',
            'description',
            'category',
            'target_region',
            'status',
            'assigned_reviewers',
            'target_count',
            'deadline',
        ]
    
    def validate_project_name(self, value):
        """Ensure project name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Project name is required")
        return value.strip()
    
    def validate_target_count(self, value):
        """Ensure target count is positive"""
        if value < 0:
            raise serializers.ValidationError("Target count must be positive")
        return value


# ============================================================================
# ENHANCED UNVERIFIED SITE SERIALIZERS (with project support)
# ============================================================================

class UnverifiedSiteProjectSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing sites within projects.
    Used in project site lists.
    """
    collected_by_name = serializers.CharField(source='collected_by.full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True, allow_null=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, allow_null=True)
    
    project_info = serializers.SerializerMethodField()
    
    verification_status_display = serializers.CharField(
        source='get_verification_status_display',
        read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    # Review notes count
    notes_count = serializers.SerializerMethodField()
    has_unread_notes = serializers.SerializerMethodField()
    
    class Meta:
        model = UnverifiedSite
        fields = [
            'site_id',
            'project',
            'project_info',
            'company_name',
            'category',
            'category_display',
            'country',
            'website',
            'verification_status',
            'verification_status_display',
            'priority',
            'priority_display',
            'data_quality_score',
            'is_duplicate',
            'collected_by',
            'collected_by_name',
            'verified_by',
            'verified_by_name',
            'assigned_to',
            'assigned_to_name',
            'collected_date',
            'verified_date',
            'notes_count',
            'has_unread_notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'site_id',
            'data_quality_score',
            'is_duplicate',
            'collected_date',
            'created_at',
            'updated_at',
        ]
    
    def get_project_info(self, obj):
        """Get basic project information"""
        if obj.project:
            return {
                'project_id': str(obj.project.project_id),
                'project_name': obj.project.project_name,
                'status': obj.project.status,
            }
        return None
    
    def get_notes_count(self, obj):
        """Count review notes"""
        return obj.review_notes.count()
    
    def get_has_unread_notes(self, obj):
        """Check if there are new notes (simplified - you can enhance this)"""
        # You can track read status if needed
        return obj.review_notes.exists()


class UnverifiedSiteDetailWithNotesSerializer(serializers.ModelSerializer):
    """
    Detailed serializer including review notes for single site view.
    """
    collected_by_info = UserBasicSerializer(source='collected_by', read_only=True)
    verified_by_info = UserBasicSerializer(source='verified_by', read_only=True)
    assigned_to_info = UserBasicSerializer(source='assigned_to', read_only=True)
    
    project_info = DataCollectionProjectListSerializer(source='project', read_only=True)
    
    verification_status_display = serializers.CharField(
        source='get_verification_status_display',
        read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    # Review notes
    review_notes = ReviewNoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = UnverifiedSite
        fields = '__all__'
        read_only_fields = [
            'site_id',
            'data_quality_score',
            'is_duplicate',
            'duplicate_of',
            'collected_date',
            'created_at',
            'updated_at',
        ]


# ============================================================================
# ACTION SERIALIZERS
# ============================================================================

class BulkProjectActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on sites within a project"""
    site_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True,
        min_length=1
    )
    action = serializers.ChoiceField(
        choices=['approve', 'reject', 'transfer', 'under_review', 'needs_revision'],
        required=True
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional note for the action"
    )


class SendForRevisionSerializer(serializers.Serializer):
    """Serializer for sending a site back to data collector for revision"""
    note = serializers.CharField(
        required=True,
        help_text="Explanation of what needs to be revised"
    )
    
    def validate_note(self, value):
        """Ensure note is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("You must provide a revision note")
        return value.strip()


class ProjectStatsSerializer(serializers.Serializer):
    """Serializer for project statistics"""
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    completed_projects = serializers.IntegerField()
    total_sites_in_projects = serializers.IntegerField()
    pending_review_sites = serializers.IntegerField()
    needs_revision_sites = serializers.IntegerField()
    approved_sites = serializers.IntegerField()
    by_category = serializers.DictField()
    by_status = serializers.DictField()
    recent_projects = DataCollectionProjectListSerializer(many=True)


class UnverifiedSiteUpdateSerializer(serializers.ModelSerializer):
    """
    ✅ FIXED: Serializer for updating unverified sites.
    - Makes country field required
    - Uses ONLY fields that actually exist in the UnverifiedSite model
    """
    
    class Meta:
        model = UnverifiedSite
        # Use all fields from the model
        fields = '__all__'
        
        # Mark read-only fields that shouldn't be updated
        read_only_fields = [
            'site_id',
            'project',
            'collected_by',
            'verified_by',
            'collected_date',
            'verified_date',
            'data_quality_score',
            'is_duplicate',
            'duplicate_of',
            'created_at',
            'updated_at',
        ]
    
    def validate_company_name(self, value):
        """Ensure company name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Company name is required and cannot be empty")
        return value.strip()
    
    def validate_country(self, value):
        """✅ NEW: Ensure country is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Country is required and cannot be empty")
        return value.strip()
    
    def validate(self, data):
        """
        ✅ NEW: Object-level validation to check for duplicates during update.
        This validation runs BEFORE the update is saved.
        """
        # Get the instance being updated (the current site)
        instance = self.instance
        
        # Get the new values (or use existing values if not being changed)
        company_name = data.get('company_name', instance.company_name)
        country = data.get('country', instance.country)
        
        # Check if another site with the same company_name + country exists
        # in the same project (excluding the current site being edited)
        if instance and instance.project:
            duplicate_check = UnverifiedSite.objects.filter(
                project=instance.project,
                company_name__iexact=company_name.strip(),
                country__iexact=country.strip()
            ).exclude(site_id=instance.site_id)
            
            if duplicate_check.exists():
                existing_site = duplicate_check.first()
                raise serializers.ValidationError({
                    'company_name': f'A site with company name "{company_name}" and country "{country}" already exists in this project.',
                    'country': 'This combination of company name and country already exists.',
                    'existing_site_id': str(existing_site.site_id)
                })
        
        return data
    
    def update(self, instance, validated_data):
        """
        Custom update to handle all fields properly.
        Only updates fields that are provided in the request.
        """
        # Update only the fields that were provided
        for field, value in validated_data.items():
            setattr(instance, field, value)
        
        instance.save()
        return instance