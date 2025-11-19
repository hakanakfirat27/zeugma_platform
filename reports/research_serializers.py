# reports/research_serializers.py
"""
Serializers for Company Research Results
"""

from rest_framework import serializers
from .models import CompanyResearchResult
from .shared_serializers import UserBasicSerializer


class CompanyResearchResultListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing research results (list view).
    Minimal fields for performance.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    searched_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyResearchResult
        fields = [
            'research_id',
            'company_name',
            'country',
            'official_name',
            'city',
            'industry',
            'website',
            'is_favorite',
            'user_name',
            'searched_at',
            'searched_at_formatted',
            'model_used',
        ]
        read_only_fields = ['research_id', 'searched_at', 'user_name']
    
    def get_searched_at_formatted(self, obj):
        """Return formatted date/time"""
        return obj.searched_at.strftime('%b %d, %Y %I:%M %p')


class CompanyResearchResultDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed view of a single research result.
    Includes full result_data.
    """
    user_info = UserBasicSerializer(source='user', read_only=True)
    searched_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyResearchResult
        fields = '__all__'
        read_only_fields = ['research_id', 'user', 'searched_at']
    
    def get_searched_at_formatted(self, obj):
        """Return formatted date/time"""
        return obj.searched_at.strftime('%b %d, %Y %I:%M %p')


class CompanyResearchResultCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new research results.
    Used by the research endpoint to auto-save results.
    """
    class Meta:
        model = CompanyResearchResult
        fields = [
            'company_name',
            'country',
            'result_data',
        ]
    
    def validate(self, data):
        """Validate required fields"""
        if not data.get('company_name'):
            raise serializers.ValidationError({
                'company_name': 'Company name is required'
            })
        if not data.get('country'):
            raise serializers.ValidationError({
                'country': 'Country is required'
            })
        if not data.get('result_data'):
            raise serializers.ValidationError({
                'result_data': 'Result data is required'
            })
        return data
    
    def create(self, validated_data):
        """Create research result with current user"""
        user = self.context['request'].user
        return CompanyResearchResult.objects.create(
            user=user,
            **validated_data
        )


class CompanyResearchResultUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating research results.
    Only allows updating notes and favorite status.
    """
    class Meta:
        model = CompanyResearchResult
        fields = ['is_favorite', 'notes']


class CompanyResearchStatsSerializer(serializers.Serializer):
    """
    Serializer for research statistics.
    """
    total_searches = serializers.IntegerField()
    searches_today = serializers.IntegerField()
    searches_this_week = serializers.IntegerField()
    searches_this_month = serializers.IntegerField()
    favorite_count = serializers.IntegerField()
    top_countries = serializers.ListField()
    top_industries = serializers.ListField()
    recent_searches = CompanyResearchResultListSerializer(many=True)