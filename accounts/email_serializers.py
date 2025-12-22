# accounts/email_serializers.py
# Serializers for email templates and branding

from rest_framework import serializers
from .email_models import EmailBranding, EmailTemplate


class EmailBrandingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailBranding
        fields = [
            'id', 'company_name', 'logo_url', 'primary_color', 'secondary_color',
            'footer_text', 'support_email', 'website_url', 'social_links',
            'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by', 'updated_by_name']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return None


class EmailTemplateSerializer(serializers.ModelSerializer):
    template_type_display = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'template_type', 'template_type_display', 'name', 'subject',
            'html_content', 'text_content', 'available_variables', 'is_active',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'template_type', 'created_at', 'updated_at', 'updated_by', 'updated_by_name']

    def get_template_type_display(self, obj):
        return obj.get_template_type_display()

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return None


class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view"""
    template_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'template_type', 'template_type_display', 'name',
            'subject', 'is_active', 'updated_at'
        ]

    def get_template_type_display(self, obj):
        return obj.get_template_type_display()


class EmailPreviewSerializer(serializers.Serializer):
    """Serializer for email preview request"""
    template_id = serializers.IntegerField(required=False)
    template_type = serializers.CharField(required=False)
    subject = serializers.CharField(required=False)
    html_content = serializers.CharField(required=False)
    test_data = serializers.DictField(required=False, default=dict)

    def validate(self, data):
        if not data.get('template_id') and not data.get('html_content'):
            raise serializers.ValidationError(
                "Either template_id or html_content is required"
            )
        return data


class SendTestEmailSerializer(serializers.Serializer):
    """Serializer for sending test email"""
    template_id = serializers.IntegerField()
    to_email = serializers.EmailField()
    test_data = serializers.DictField(required=False, default=dict)
