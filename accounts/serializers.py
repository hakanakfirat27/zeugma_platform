from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    # This custom field will combine the user's first and last name.
    full_name = serializers.SerializerMethodField()
    # This custom field will generate the initials for the avatar.
    initials = serializers.SerializerMethodField()
    # This will get the display-friendly name for the role (e.g., "Staff Admin")
    role_display = serializers.CharField(source='get_role_display')

    class Meta:
        model = User
        # List of fields to include in the API response.
        fields = ['id', 'username', 'full_name', 'initials', 'role', 'role_display']

    def get_full_name(self, obj):
        # Returns "Firstname Lastname" or just the username if names are not set.
        return obj.get_full_name() or obj.username

    def get_initials(self, obj):
        first = obj.first_name[0] if obj.first_name else ''
        last = obj.last_name[0] if obj.last_name else ''
        # Return "FL" or just the first letter of the username as a fallback.
        return (first + last).upper() or obj.username[0].upper()