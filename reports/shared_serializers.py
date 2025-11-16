# reports/shared_serializers.py

"""
Shared serializers used across multiple modules.
This avoids duplication and ensures consistency.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """
    Basic user info for nested serialization.
    Used across unverified sites and project management.
    """
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'initials', 'role']
        read_only_fields = fields