# reports/unverified_serializers.py

"""
Serializers for UnverifiedSite API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UnverifiedSite, VerificationHistory, VerificationStatus, DataSource, PriorityLevel
from .shared_serializers import UserBasicSerializer  # IMPORT FROM SHARED

User = get_user_model()


# UserBasicSerializer is now imported from shared_serializers.py
# No need to redefine it here


class UnverifiedSiteListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing unverified sites (list view).
    Includes minimal fields for performance.
    """
    collected_by_name = serializers.CharField(source='collected_by.username', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    
    verification_status_display = serializers.CharField(
        source='get_verification_status_display',
        read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    source_display = serializers.CharField(
        source='get_source_display',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    class Meta:
        model = UnverifiedSite
        fields = [
            'site_id',
            'company_name',
            'category',
            'category_display',
            'country',
            'verification_status',
            'verification_status_display',
            'priority',
            'priority_display',
            'source',
            'source_display',
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


class UnverifiedSiteDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed view of a single unverified site.
    Includes all fields and nested relationships.
    """
    collected_by_info = UserBasicSerializer(source='collected_by', read_only=True)
    verified_by_info = UserBasicSerializer(source='verified_by', read_only=True)
    assigned_to_info = UserBasicSerializer(source='assigned_to', read_only=True)
    
    verification_status_display = serializers.CharField(
        source='get_verification_status_display',
        read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    source_display = serializers.CharField(
        source='get_source_display',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    # Duplicate info
    duplicate_of_info = serializers.SerializerMethodField()
    
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
    
    def get_duplicate_of_info(self, obj):
        """Return basic info about the duplicate if exists"""
        if obj.duplicate_of:
            return {
                'factory_id': str(obj.duplicate_of.factory_id),
                'company_name': obj.duplicate_of.company_name,
                'country': obj.duplicate_of.country,
                'category': obj.duplicate_of.get_category_display(),
            }
        return None


class UnverifiedSiteCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating unverified sites.
    """
    
    class Meta:
        model = UnverifiedSite
        exclude = [
            'site_id',
            'data_quality_score',
            'is_duplicate',
            'duplicate_of',
            'collected_date',
            'created_at',
            'updated_at',
        ]
    
    def validate_company_name(self, value):
        """Ensure company name is provided"""
        if not value or not value.strip():
            raise serializers.ValidationError("Company name is required")
        return value.strip()
    
    def validate(self, data):
        """Additional validation"""
        # Ensure at least country is provided
        if not data.get('country'):
            raise serializers.ValidationError({
                'country': 'Country is required'
            })
        
        return data


class VerificationHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for verification history entries.
    """
    performed_by_info = UserBasicSerializer(source='performed_by', read_only=True)
    site_info = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = VerificationHistory
        fields = '__all__'
        read_only_fields = [
            'history_id',
            'timestamp',
        ]
    
    def get_site_info(self, obj):
        """Return basic info about the site"""
        return {
            'site_id': str(obj.site.site_id),
            'company_name': obj.site.company_name,
            'category': obj.site.get_category_display(),
        }


class ApproveRejectSerializer(serializers.Serializer):
    """
    Serializer for approve/reject actions.
    """
    comments = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class AssignReviewerSerializer(serializers.Serializer):
    """
    Serializer for assigning a reviewer to a site.
    """
    assigned_to = serializers.IntegerField(required=True)
    comments = serializers.CharField(required=False, allow_blank=True)
    
    def validate_assigned_to(self, value):
        """Ensure user exists and has appropriate role"""
        try:
            user = User.objects.get(id=value)
            if user.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
                raise serializers.ValidationError(
                    "Only Superadmin or Staff Admin can be assigned as reviewers"
                )
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")


class BulkActionSerializer(serializers.Serializer):
    """
    Serializer for bulk actions on multiple sites.
    """
    site_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True,
        min_length=1
    )
    action = serializers.ChoiceField(
        choices=['approve', 'reject', 'under_review'],
        required=True
    )
    comments = serializers.CharField(required=False, allow_blank=True)


class UnverifiedSiteStatsSerializer(serializers.Serializer):
    """
    Serializer for statistics about unverified sites.
    """
    total = serializers.IntegerField()
    by_status = serializers.DictField()
    by_priority = serializers.DictField()
    by_source = serializers.DictField()
    by_category = serializers.DictField()
    avg_quality_score = serializers.FloatField()
    duplicates_count = serializers.IntegerField()
    pending_review = serializers.IntegerField()
    approved_not_transferred = serializers.IntegerField()