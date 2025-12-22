from rest_framework import serializers
from .models import Notification, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'is_read',
            'created_at',
            'time',
            'related_report_id',
            'related_subscription_id',
            'related_message_id',
            'related_announcement_id'
        ]

    def get_time(self, obj):
        return obj.time_since()


class PushSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for viewing push subscriptions."""
    
    class Meta:
        model = PushSubscription
        fields = [
            'id',
            'device_name',
            'user_agent',
            'is_active',
            'created_at',
            'last_used',
        ]
        read_only_fields = ['id', 'created_at', 'last_used']


class PushSubscriptionCreateSerializer(serializers.Serializer):
    """Serializer for creating a push subscription."""
    
    endpoint = serializers.CharField()
    keys = serializers.DictField(child=serializers.CharField())
    device_name = serializers.CharField(required=False, allow_blank=True)
    
    def validate_keys(self, value):
        if 'p256dh' not in value or 'auth' not in value:
            raise serializers.ValidationError(
                "Keys must include 'p256dh' and 'auth'"
            )
        return value
    
    def create(self, validated_data):
        user = self.context['request'].user
        endpoint = validated_data['endpoint']
        keys = validated_data['keys']
        device_name = validated_data.get('device_name', '')
        user_agent = self.context['request'].META.get('HTTP_USER_AGENT', '')
        
        # Update or create subscription
        subscription, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': user,
                'p256dh_key': keys['p256dh'],
                'auth_key': keys['auth'],
                'device_name': device_name or self._detect_device_name(user_agent),
                'user_agent': user_agent,
                'is_active': True,
            }
        )
        
        return subscription
    
    def _detect_device_name(self, user_agent):
        """Try to detect a friendly device name from user agent."""
        ua = user_agent.lower()
        
        if 'mobile' in ua or 'android' in ua:
            if 'android' in ua:
                return 'Android Phone'
            elif 'iphone' in ua:
                return 'iPhone'
            return 'Mobile Device'
        elif 'tablet' in ua or 'ipad' in ua:
            return 'Tablet'
        elif 'windows' in ua:
            return 'Windows PC'
        elif 'macintosh' in ua or 'mac os' in ua:
            return 'Mac'
        elif 'linux' in ua:
            return 'Linux PC'
        elif 'chrome' in ua:
            return 'Chrome Browser'
        elif 'firefox' in ua:
            return 'Firefox Browser'
        elif 'safari' in ua:
            return 'Safari Browser'
        
        return 'Unknown Device'