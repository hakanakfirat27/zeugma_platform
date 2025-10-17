from rest_framework import serializers
from .models import (
    SuperdatabaseRecord,
    DashboardWidget,
    CustomReport,
    Subscription,
    SubscriptionPlan
)
from accounts.models import User
from .fields import (
    COMMON_FIELDS, CONTACT_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
    PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS,
    CABLE_FIELDS, COMPOUNDER_FIELDS
)


# --- Superdatabase Record Serilalizer Class ---
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


# --- Superdatabase Record Detail Serilalizer Class ---
class SuperdatabaseRecordDetailSerializer(serializers.ModelSerializer):
    """
    Custom serializer for the record detail view (modal).
    It includes the field's verbose_name, key, and value for easier frontend rendering.
    """
    get_category_display = serializers.CharField(read_only=True)
    detailed_fields = serializers.SerializerMethodField()

    class Meta:
        model = SuperdatabaseRecord
        fields = [
            'factory_id', 'company_name', 'category', 'get_category_display',
            'country', 'last_updated', 'surname_1', 'surname_2', 'surname_3',
            'surname_4', 'initials_1', 'initials_2', 'initials_3', 'initials_4',
            'title_1', 'title_2', 'title_3', 'title_4', 'position_1', 'position_2',
            'position_3', 'position_4',
            'detailed_fields'  # <-- FIX: This line is essential and must be present
        ]

    def get_detailed_fields(self, instance):
        """
        This method iterates over the model's fields and builds a list of objects,
        each containing the field's key, verbose_name (label), and its value.
        """
        field_data = []
        for field in SuperdatabaseRecord._meta.get_fields():
            if field.concrete and not field.is_relation:
                field_data.append({
                    'key': field.name,
                    'label': field.verbose_name,
                    'value': getattr(instance, field.name)
                })
        return field_data


# --- Custom Report Serializer Class ---
class CustomReportSerializer(serializers.ModelSerializer):
    """Serializer for custom reports"""
    created_by_name = serializers.SerializerMethodField()
    subscription_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomReport
        fields = [
            'report_id', 'title', 'description', 'filter_criteria',
            'monthly_price', 'annual_price', 'is_active', 'is_featured',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'record_count', 'subscription_count'
        ]
        read_only_fields = ['report_id', 'created_at', 'updated_at', 'record_count']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_subscription_count(self, obj):
        return obj.subscriptions.filter(status='ACTIVE').count()

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
            'report_id', 'title', 'description',
            'monthly_price', 'annual_price', 'is_active', 'is_featured',
            'created_by_name', 'created_at', 'record_count', 'subscription_count'
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
    report_title = serializers.SerializerMethodField()
    is_active = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()

    class Meta:
        model = Subscription
        fields = [
            'subscription_id', 'client', 'client_name', 'client_email',
            'report', 'report_title', 'plan', 'status',
            'start_date', 'end_date', 'amount_paid',
            'is_active', 'days_remaining',
            'created_at', 'updated_at', 'notes'
        ]
        read_only_fields = ['subscription_id', 'created_at', 'updated_at']

    def get_client_name(self, obj):
        return obj.client.get_full_name() or obj.client.username

    def get_client_email(self, obj):
        return obj.client.email

    def get_report_title(self, obj):
        return obj.report.title


# --- Subscription Create Serializer Class ---
class SubscriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subscriptions"""

    # Accept UUID for report instead of integer ID
    report = serializers.SlugRelatedField(
        slug_field='report_id',
        queryset=CustomReport.objects.all()
    )

    class Meta:
        model = Subscription
        fields = [
            'client', 'report', 'plan', 'status',
            'start_date', 'end_date', 'amount_paid', 'notes'
        ]

    def validate(self, data):
        """Validate subscription data"""
        # Check if report is active
        if not data['report'].is_active:
            raise serializers.ValidationError({"report": "Cannot subscribe to an inactive report."})

        # Check date range
        if data['end_date'] <= data['start_date']:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})

        # Check for overlapping subscriptions
        overlapping = Subscription.objects.filter(
            client=data['client'],
            report=data['report'],
            status='ACTIVE'
        ).filter(
            start_date__lte=data['end_date'],
            end_date__gte=data['start_date']
        ).exists()

        if overlapping:
            raise serializers.ValidationError({
                "report": "Client already has an active subscription for this report in the given period."
            })

        return data


# --- Report Preview Serializer Class ---
class ReportPreviewSerializer(serializers.Serializer):
    """Serializer for report preview data"""
    total_records = serializers.IntegerField()
    filter_criteria = serializers.JSONField()
    sample_records = SuperdatabaseRecordSerializer(many=True)
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


