# dashboard/serializers.py

from rest_framework import serializers
from .models import UserActivity, RecentlyViewedCompany


class UserActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(
        source='get_activity_type_display',
        read_only=True
    )
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = UserActivity
        fields = [
            'id',
            'activity_type',
            'activity_type_display',
            'company_name',
            'report_title',
            'collection_name',
            'report_id',
            'record_id',
            'collection_id',
            'description',
            'country',
            'created_at',
            'time_ago',
        ]
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes} minute{"s" if minutes > 1 else ""} ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours} hour{"s" if hours > 1 else ""} ago'
        elif diff < timedelta(days=7):
            days = diff.days
            return f'{days} day{"s" if days > 1 else ""} ago'
        else:
            return obj.created_at.strftime('%b %d, %Y')


class RecentlyViewedCompanySerializer(serializers.ModelSerializer):
    report_id = serializers.UUIDField(source='report.report_id', read_only=True)
    report_title = serializers.CharField(source='report.title', read_only=True)
    
    class Meta:
        model = RecentlyViewedCompany
        fields = [
            'id',
            'report_id',
            'report_title',
            'record_id',
            'company_name',
            'country',
            'category',
            'viewed_at',
        ]


class ReportCategoryStatsSerializer(serializers.Serializer):
    """Serializer for reports by category statistics"""
    category = serializers.CharField()
    category_display = serializers.CharField()
    count = serializers.IntegerField()
    color = serializers.CharField()


class CountryStatsSerializer(serializers.Serializer):
    """Serializer for companies by country statistics"""
    country = serializers.CharField()
    count = serializers.IntegerField()
    flag = serializers.CharField(required=False)


class SubscriptionTimelineSerializer(serializers.Serializer):
    """Serializer for subscription timeline data"""
    id = serializers.UUIDField()
    report_title = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    days_remaining = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    status = serializers.CharField()
    is_expiring_soon = serializers.BooleanField()
