# accounts/user_settings_serializers.py

from rest_framework import serializers
from .user_settings_models import UserSettings, DefaultUserSettings


class UserSettingsSerializer(serializers.ModelSerializer):
    """Serializer for user settings"""
    
    class Meta:
        model = UserSettings
        fields = [
            'theme_mode',
            'header_color_scheme',
            'header_style',
            'sidebar_color_scheme',
            'sidebar_style',
            'sidebar_collapsed',
            'email_notifications',
            'push_notifications',
            'inapp_notifications',
            'notification_sound',
            'notification_preferences',
            'compact_mode',
            'animation_enabled',
            'high_contrast',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class DefaultUserSettingsSerializer(serializers.ModelSerializer):
    """Serializer for default user settings (admin only)"""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DefaultUserSettings
        fields = [
            'id',
            'role',
            'role_display',
            'default_theme_mode',
            'default_header_color_scheme',
            'default_header_style',
            'default_sidebar_color_scheme',
            'default_sidebar_style',
            'default_email_notifications',
            'default_push_notifications',
            'default_inapp_notifications',
            'default_sidebar_collapsed',
            'default_animation_enabled',
            'updated_at',
            'updated_by',
            'updated_by_name',
        ]
        read_only_fields = ['id', 'role', 'role_display', 'updated_at', 'updated_by', 'updated_by_name']
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.full_name or obj.updated_by.username
        return None


class UserSettingsChoicesSerializer(serializers.Serializer):
    """Serializer for available settings choices"""
    
    theme_modes = serializers.SerializerMethodField()
    color_schemes = serializers.SerializerMethodField()
    header_styles = serializers.SerializerMethodField()
    sidebar_styles = serializers.SerializerMethodField()
    
    def get_theme_modes(self, obj):
        return [{'value': v, 'label': l} for v, l in UserSettings.ThemeMode.choices]
    
    def get_color_schemes(self, obj):
        return [{'value': v, 'label': l} for v, l in UserSettings.ColorScheme.choices]
    
    def get_header_styles(self, obj):
        return [{'value': v, 'label': l} for v, l in UserSettings.HeaderStyle.choices]
    
    def get_sidebar_styles(self, obj):
        return [{'value': v, 'label': l} for v, l in UserSettings.SidebarStyle.choices]
