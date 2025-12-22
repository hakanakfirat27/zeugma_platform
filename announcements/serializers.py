# backend/announcements/serializers.py
from rest_framework import serializers
from .models import Announcement, AnnouncementView, AnnouncementAttachment
from django.contrib.auth import get_user_model

User = get_user_model()


class AnnouncementAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for announcement attachments"""
    file_size_display = serializers.CharField(source='get_file_size_display', read_only=True)

    class Meta:
        model = AnnouncementAttachment
        fields = ['id', 'file', 'file_name', 'file_size', 'file_size_display', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at', 'file_size_display']


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for announcements"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']


class AnnouncementViewSerializer(serializers.ModelSerializer):
    """Serializer for tracking announcement views"""
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = AnnouncementView
        fields = ['id', 'user', 'viewed_at', 'acknowledged', 'acknowledged_at']
        read_only_fields = ['id', 'viewed_at', 'acknowledged_at']


class AnnouncementListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing announcements"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    has_viewed = serializers.SerializerMethodField()
    has_acknowledged = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'summary', 'announcement_type', 'priority', 'status',
            'target_audience', 'start_date', 'end_date', 'is_pinned', 'show_popup',
            'require_acknowledgment', 'icon', 'color_scheme', 'created_by_name',
            'created_at', 'updated_at', 'views_count', 'is_active',
            'has_viewed', 'has_acknowledged'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'views_count']

    def get_has_viewed(self, obj):
        """Check if current user has viewed this announcement"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return AnnouncementView.objects.filter(
                announcement=obj,
                user=request.user
            ).exists()
        return False

    def get_has_acknowledged(self, obj):
        """Check if current user has acknowledged this announcement"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            view = AnnouncementView.objects.filter(
                announcement=obj,
                user=request.user
            ).first()
            return view.acknowledged if view else False
        return False


class AnnouncementDetailSerializer(serializers.ModelSerializer):
    """Full serializer for announcement details"""
    created_by = UserBasicSerializer(read_only=True)
    specific_users = UserBasicSerializer(many=True, read_only=True)
    specific_user_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=User.objects.all(),
        source='specific_users',
        required=False
    )
    attachments = AnnouncementAttachmentSerializer(many=True, read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    has_viewed = serializers.SerializerMethodField()
    has_acknowledged = serializers.SerializerMethodField()
    view_stats = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'summary', 'announcement_type', 'priority',
            'status', 'target_audience', 'specific_users', 'specific_user_ids',
            'start_date', 'end_date', 'is_pinned', 'show_popup',
            'require_acknowledgment', 'icon', 'color_scheme',
            'action_button_text', 'action_button_url',
            'created_by', 'created_at', 'updated_at', 'views_count',
            'attachments', 'is_active', 'has_viewed', 'has_acknowledged',
            'view_stats'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'views_count', 'created_by']

    def get_has_viewed(self, obj):
        """Check if current user has viewed this announcement"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return AnnouncementView.objects.filter(
                announcement=obj,
                user=request.user
            ).exists()
        return False

    def get_has_acknowledged(self, obj):
        """Check if current user has acknowledged this announcement"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            view = AnnouncementView.objects.filter(
                announcement=obj,
                user=request.user
            ).first()
            return view.acknowledged if view else False
        return False

    def get_view_stats(self, obj):
        """Get view and acknowledgment statistics"""
        total_views = obj.user_views.count()
        total_acknowledged = obj.user_views.filter(acknowledged=True).count()
        target_users_count = obj.get_target_users().count()

        return {
            'total_views': total_views,
            'total_acknowledged': total_acknowledged,
            'target_users_count': target_users_count,
            'view_rate': round((total_views / target_users_count * 100), 2) if target_users_count > 0 else 0,
            'acknowledgment_rate': round((total_acknowledged / target_users_count * 100),
                                         2) if target_users_count > 0 else 0,
        }

    def create(self, validated_data):
        """Create announcement with current user as creator"""
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        return super().create(validated_data)


class AnnouncementStatsSerializer(serializers.Serializer):
    """Serializer for announcement statistics"""
    total_announcements = serializers.IntegerField()
    active_announcements = serializers.IntegerField()
    scheduled_announcements = serializers.IntegerField()
    draft_announcements = serializers.IntegerField()
    total_views = serializers.IntegerField()
    announcements_by_type = serializers.DictField()
    announcements_by_priority = serializers.DictField()
    recent_announcements = AnnouncementListSerializer(many=True)