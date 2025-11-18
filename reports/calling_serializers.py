# reports/calling_serializers.py
# NEW FILE - Serializers for Calling Workflow

"""
Serializers for the calling workflow system.
Add this as a new file: reports/calling_serializers.py
"""

from rest_framework import serializers
from django.utils import timezone
from .models import CallLog, FieldConfirmation, UnverifiedSite, CallingStatusHistory
from .shared_serializers import UserBasicSerializer


# =============================================================================
# CALL LOG SERIALIZERS
# =============================================================================

class CallLogSerializer(serializers.ModelSerializer):
    """Serializer for CallLog model"""
    
    created_by_info = UserBasicSerializer(source='created_by', read_only=True)
    formatted_timestamp = serializers.CharField(read_only=True)
    
    class Meta:
        model = CallLog
        fields = [
            'call_id',
            'site',
            'call_number',
            'call_timestamp',
            'formatted_timestamp',
            'call_notes',
            'created_by',
            'created_by_info',
            'created_at',
        ]
        read_only_fields = ['call_id', 'call_number', 'created_at', 'formatted_timestamp']


class CallLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating call logs"""
    
    class Meta:
        model = CallLog
        fields = ['call_notes']
    
    def validate_call_notes(self, value):
        """Ensure call notes are not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Call notes cannot be empty")
        return value.strip()


# =============================================================================
# FIELD CONFIRMATION SERIALIZERS
# =============================================================================

class FieldConfirmationSerializer(serializers.ModelSerializer):
    """Serializer for FieldConfirmation model"""
    
    confirmed_by_info = UserBasicSerializer(source='confirmed_by', read_only=True)
    
    class Meta:
        model = FieldConfirmation
        fields = [
            'confirmation_id',
            'site',
            'field_name',
            'is_confirmed',
            'is_new_data',
            'is_pre_filled',
            'last_selected',
            'confirmed_by',
            'confirmed_by_info',
            'confirmed_at',
            'notes',
            'created_at',
            'updated_at',
            
        ]
        read_only_fields = ['confirmation_id', 'created_at', 'updated_at']


class FieldConfirmationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating field confirmations"""
    
    class Meta:
        model = FieldConfirmation
        fields = ['is_confirmed', 'is_new_data', 'notes']
    
    def update(self, instance, validated_data):
        """Update confirmation and set timestamp"""
        if validated_data.get('is_confirmed') and not instance.is_confirmed:
            # First time confirming
            instance.confirmed_at = timezone.now()
            instance.confirmed_by = self.context['request'].user
        
        return super().update(instance, validated_data)


class BulkFieldConfirmationSerializer(serializers.Serializer):
    """Serializer for bulk field confirmation updates"""
    
    confirmations = serializers.ListField(
        child=serializers.DictField(),
        help_text='List of field confirmations to update'
    )
    
    def validate_confirmations(self, value):
        """Validate confirmation data structure"""
        for item in value:
            if 'field_name' not in item:
                raise serializers.ValidationError("Each confirmation must have 'field_name'")
            
            # Validate boolean fields if present
            for bool_field in ['is_confirmed', 'is_new_data', 'is_pre_filled']:  # ← ADD is_pre_filled
                if bool_field in item and not isinstance(item[bool_field], bool):
                    raise serializers.ValidationError(f"{bool_field} must be a boolean")
            
            # Validate last_selected if present
            if 'last_selected' in item:
                valid_choices = ['is_confirmed', 'is_new_data', 'is_pre_filled']
                if item['last_selected'] not in valid_choices and item['last_selected'] is not None:
                    raise serializers.ValidationError(
                        f"last_selected must be one of {valid_choices} or null"
                    )
        
        return value


# =============================================================================
# ENHANCED SITE SERIALIZERS (WITH CALLING WORKFLOW)
# =============================================================================

class SiteCallingStatusSerializer(serializers.ModelSerializer):
    """Compact serializer for site calling status"""
    
    calling_status_display = serializers.CharField(source='get_calling_status_display', read_only=True)
    calling_status_changed_by_info = UserBasicSerializer(source='calling_status_changed_by', read_only=True)
    total_calls = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = UnverifiedSite
        fields = [
            'site_id',
            'company_name',
            'calling_status',
            'calling_status_display',
            'calling_status_changed_at',
            'calling_status_changed_by_info',
            'total_calls',
        ]


class CallingStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating calling status"""
    
    calling_status = serializers.ChoiceField(
        choices=[
            'YELLOW',
            'RED',
            'PURPLE',
            'BLUE',
            'GREEN',
        ],
        help_text='New calling status'
    )
    
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Optional notes about the status change'
    )
    
    def validate_calling_status(self, value):
        """Validate status transition"""
        # Add any business logic for valid status transitions if needed
        return value


# =============================================================================
# STATISTICS SERIALIZERS
# =============================================================================

class CallingStatsSerializer(serializers.Serializer):
    """Serializer for calling workflow statistics"""
    
    total_sites = serializers.IntegerField()
    not_started = serializers.IntegerField()
    yellow_status = serializers.IntegerField()
    red_status = serializers.IntegerField()
    purple_status = serializers.IntegerField()
    blue_status = serializers.IntegerField()
    green_status = serializers.IntegerField()
    
    avg_calls_per_site = serializers.FloatField()
    total_calls_made = serializers.IntegerField()
    
    sites_needing_attention = serializers.IntegerField()
    sites_ready_for_review = serializers.IntegerField()


class SiteCallingDetailsSerializer(serializers.ModelSerializer):
    """Detailed serializer with calling workflow data"""
    
    calling_status_display = serializers.CharField(source='get_calling_status_display', read_only=True)
    calling_status_changed_by_info = UserBasicSerializer(source='calling_status_changed_by', read_only=True)
    
    # Include call logs
    call_logs = CallLogSerializer(many=True, read_only=True)
    
    # Include field confirmations
    field_confirmations = FieldConfirmationSerializer(many=True, read_only=True)
    
    # Pre-filled info
    pre_filled_by_info = UserBasicSerializer(source='pre_filled_by', read_only=True)
    
    class Meta:
        model = UnverifiedSite
        fields = [
            'site_id',
            'company_name',
            'calling_status',
            'calling_status_display',
            'calling_status_changed_at',
            'calling_status_changed_by_info',
            'total_calls',
            'is_pre_filled',
            'pre_filled_by_info',
            'pre_filled_at',
            'call_logs',
            'field_confirmations',
        ]


class CallingStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for status change history"""
    
    changed_by_info = UserBasicSerializer(source='changed_by', read_only=True)
    formatted_timestamp = serializers.CharField(read_only=True)
    
    old_status_display = serializers.SerializerMethodField()
    new_status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = CallingStatusHistory
        fields = [
            'history_id',
            'old_status',
            'new_status',
            'old_status_display',
            'new_status_display',
            'status_notes',
            'changed_by_info',
            'changed_at',
            'formatted_timestamp',
        ]
        read_only_fields = ['history_id', 'changed_at', 'formatted_timestamp']
    
    def get_old_status_display(self, obj):
        status_map = {
            'NOT_STARTED': 'Not Started',
            'YELLOW': 'Needs Alternative Numbers',
            'RED': 'Not Relevant / Never Picked Up',
            'PURPLE': 'Language Barrier',
            'BLUE': 'Call Back Later',
            'GREEN': 'Complete - Ready for Review',
        }
        return status_map.get(obj.old_status, obj.old_status)
    
    def get_new_status_display(self, obj):
        status_map = {
            'NOT_STARTED': 'Not Started',
            'YELLOW': 'Needs Alternative Numbers',
            'RED': 'Not Relevant / Never Picked Up',
            'PURPLE': 'Language Barrier',
            'BLUE': 'Call Back Later',
            'GREEN': 'Complete - Ready for Review',
        }
        return status_map.get(obj.new_status, obj.new_status)