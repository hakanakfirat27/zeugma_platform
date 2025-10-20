from rest_framework import serializers
from .models import Notification


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