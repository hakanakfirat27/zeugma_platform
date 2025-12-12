# reports/serializers.py - CLEAN VERSION (Remove all debug code)
# NOTE: Superdatabase has been deprecated. All data now uses Company Database.

from rest_framework import serializers
from .models import (
    CustomReport,
    Subscription,
    SubscriptionPlan,
    SavedSearch,
    ExportTemplate,
    DashboardWidget,
)
from .company_models import Company, ProductionSiteVersion
from accounts.models import User
from .fields import (
    COMMON_FIELDS, CONTACT_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
    PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS,
    CABLE_FIELDS, COMPOUNDER_FIELDS, RECYCLER_FIELDS
)


# --- Custom Report Serializer Class ---
class CustomReportSerializer(serializers.ModelSerializer):
    """Serializer for custom reports"""
    created_by_name = serializers.SerializerMethodField()
    subscription_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomReport
        fields = [
            'id', 'report_id', 'title', 'description', 'filter_criteria',
            'monthly_price', 'annual_price', 'is_active', 'is_featured',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'record_count', 'subscription_count', 'source_type'
        ]
        read_only_fields = ['id', 'report_id', 'created_at', 'updated_at', 'record_count']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_subscription_count(self, obj):
        return obj.subscriptions.filter(status='ACTIVE').count()

    def validate_title(self, value):
        """
        Check if a report with this title already exists.
        Allow the same title only when updating the same report.
        """
        # Get the instance being updated (None if creating new)
        instance = getattr(self, 'instance', None)

        # Check if title exists
        queryset = CustomReport.objects.filter(title__iexact=value)

        # If updating, exclude the current instance
        if instance:
            queryset = queryset.exclude(report_id=instance.report_id)

        # If any other report has this title, raise error
        if queryset.exists():
            raise serializers.ValidationError(
                "A report with this title already exists. Please choose a different title."
            )

        return value

    def create(self, validated_data):
        # Automatically set created_by from request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        report = CustomReport.objects.create(**validated_data)
        # Update record count after creation
        report.update_record_count()
        return report

    def update(self, instance, validated_data):
        # Update filter criteria if changed
        filter_changed = 'filter_criteria' in validated_data and \
                         validated_data['filter_criteria'] != instance.filter_criteria

        instance = super().update(instance, validated_data)

        # Recalculate record count if filters changed
        if filter_changed:
            instance.update_record_count()

        return instance


# --- Custom Report List Serializer Class ---
class CustomReportListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing reports"""
    created_by_name = serializers.SerializerMethodField()
    subscription_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomReport
        fields = [
            'id', 'report_id', 'title', 'description',
            'monthly_price', 'annual_price', 'is_active', 'is_featured',
            'created_by_name', 'created_at', 'record_count', 'subscription_count',
            'source_type'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_subscription_count(self, obj):
        return obj.subscriptions.filter(status='ACTIVE').count()


# --- Client Serializer Class ---
class ClientSerializer(serializers.ModelSerializer):
    """Serializer for client users"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# --- Subscription Serializer Class ---
class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    client_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_id = serializers.SerializerMethodField()
    report_title = serializers.SerializerMethodField()
    report_id = serializers.SerializerMethodField()
    report_filter_criteria = serializers.SerializerMethodField()  # ADD THIS
    is_active = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()

    class Meta:
        model = Subscription
        fields = [
            'subscription_id', 'client', 'client_id', 'client_name', 'client_email',
            'report', 'report_id', 'report_title', 'report_filter_criteria',  # ADD THIS
            'plan', 'status',
            'start_date', 'end_date', 'amount_paid',
            'is_active', 'days_remaining',
            'created_at', 'updated_at', 'notes'
        ]
        read_only_fields = ['subscription_id', 'created_at', 'updated_at']

    def get_client_id(self, obj):
        if obj.client is None:
            return None
        return obj.client.id

    def get_client_name(self, obj):
        if obj.client is None:
            return "Deleted Client"
        return obj.client.get_full_name() or obj.client.username

    def get_client_email(self, obj):
        if obj.client is None:
            return "N/A"
        return obj.client.email

    def get_report_id(self, obj):
        if obj.report is None:
            return None
        return str(obj.report.report_id)

    def get_report_title(self, obj):
        if obj.report is None:
            return "Deleted Report"
        return obj.report.title

    def get_report_filter_criteria(self, obj):
        """Include the report's filter criteria in subscription response"""
        if obj.report is None:
            return {}
        return obj.report.filter_criteria or {}

# --- Subscription Create Serializer Class ---
class SubscriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subscriptions"""

    class Meta:
        model = Subscription
        fields = [
            'client', 'report', 'plan', 'status',
            'start_date', 'end_date', 'amount_paid', 'notes'
        ]

    def validate(self, data):
        client = data.get('client')
        report = data.get('report')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        # ADD THESE LINES AT THE TOP ⬇️⬇️⬇️
        if not client:
            raise serializers.ValidationError({
                "client": "Client is required."
            })

        if not report:
            raise serializers.ValidationError({
                "report": "Report is required."
            })
        # END NEW CODE ⬆️⬆️⬆️

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date."
            )

        # Rest of validation stays the same
        if client and report:  # This can now be simplified to just check overlaps
            from django.db.models import Q
            overlapping = Subscription.objects.filter(
                client=client,
                report=report
            ).filter(
                Q(start_date__lte=end_date, end_date__gte=start_date)
            ).exists()

            if overlapping:
                raise serializers.ValidationError(
                    "This report has already been assigned to the user for an overlapping period."
                )

        return data


# --- Report Preview Serializer Class ---
class ReportPreviewSerializer(serializers.Serializer):
    """Serializer for report preview data
    NOTE: Now uses Company Database instead of Superdatabase
    """
    total_records = serializers.IntegerField()
    filter_criteria = serializers.JSONField()
    sample_records = serializers.JSONField()  # Now returns Company data as JSON
    field_breakdown = serializers.JSONField()


# --- Dashboard Widget Serializer Class ---
class DashboardWidgetSerializer(serializers.ModelSerializer):
    """Serializer for dashboard widgets"""

    class Meta:
        model = DashboardWidget
        fields = [
            'id',
            'widget_key',
            'title',
            'description',
            'icon',
            'category',
            'width',
            'height',
            'is_enabled',
            'display_order',
            'settings',
            'required_permission',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class SavedSearchSerializer(serializers.ModelSerializer):
    """Serializer for SavedSearch model"""

    class Meta:
        model = SavedSearch
        fields = [
            'id',
            'name',
            'description',
            'report',
            'user',
            'filter_params',
            'is_default',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate_filter_params(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("filter_params must be a dictionary")

        if 'countries' in value:
            if isinstance(value['countries'], str):
                value['countries'] = [c.strip() for c in value['countries'].split(',') if c.strip()]
            elif not isinstance(value['countries'], list):
                value['countries'] = [value['countries']]

        if 'categories' in value:
            if isinstance(value['categories'], str):
                value['categories'] = [c.strip() for c in value['categories'].split(',') if c.strip()]
            elif not isinstance(value['categories'], list):
                value['categories'] = [value['categories']]

        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if data.get('filter_params'):
            filter_params = data['filter_params']

            if 'countries' in filter_params and not isinstance(filter_params['countries'], list):
                filter_params['countries'] = [filter_params['countries']]

            if 'categories' in filter_params and not isinstance(filter_params['categories'], list):
                filter_params['categories'] = [filter_params['categories']]

        return data


class SavedSearchCreateSerializer(serializers.Serializer):
    """Serializer specifically for creating new saved searches"""

    name = serializers.CharField(max_length=200, required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    report_id = serializers.UUIDField(required=True)
    filter_params = serializers.JSONField(required=True)
    is_default = serializers.BooleanField(default=False, required=False)

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        return value.strip()

    def validate_filter_params(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("filter_params must be an object")
        return value

    def validate_report_id(self, value):
        try:
            CustomReport.objects.get(report_id=value)
        except CustomReport.DoesNotExist:
            raise serializers.ValidationError("Report not found")
        return value


class ExportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for ExportTemplate model"""

    id = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    report_title = serializers.CharField(source='report.title', read_only=True)

    class Meta:
        model = ExportTemplate
        fields = [
            'id',
            'name',
            'description',
            'selected_columns',
            'is_default',
            'report_title',
            'created_at',
            'updated_at'
        ]
        extra_kwargs = {
            'name': {'required': True},
            'selected_columns': {'required': True}
        }

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        return value.strip()

    def validate_selected_columns(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("selected_columns must be a list")
        if len(value) == 0:
            raise serializers.ValidationError("Please select at least one column")
        return value


class ExportTemplateCreateSerializer(serializers.Serializer):
    """Serializer for creating export templates"""

    name = serializers.CharField(max_length=200, required=True)
    description = serializers.CharField(required=False, allow_blank=True)
    report_id = serializers.UUIDField(required=True)
    selected_columns = serializers.ListField(
        child=serializers.CharField(),
        required=True
    )
    is_default = serializers.BooleanField(default=False, required=False)

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        return value.strip()

    def validate_selected_columns(self, value):
        if not isinstance(value, list) or len(value) == 0:
            raise serializers.ValidationError("Please select at least one column")
        return value

    def validate_report_id(self, value):
        try:
            CustomReport.objects.get(report_id=value)
        except CustomReport.DoesNotExist:
            raise serializers.ValidationError("Report not found")
        return value