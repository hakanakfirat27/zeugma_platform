from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for User data with computed fields
    """
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'initials',
            'role',
            'is_active',
            'is_online',
            'phone_number',
            'company_name',
            'date_joined',
            'last_login',
            'last_activity'
        ]
        read_only_fields = fields

# --- NEW SERIALIZER FOR USER MANAGEMENT ---
# This serializer is used by staff to create and update users.
class UserManagementSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating users (write operations)
    """
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'role',
            'is_active',
            'phone_number',
            'company_name',
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'username': {'required': True},
        }

    def create(self, validated_data):
        """
        Create a new user with encrypted password
        """
        password = validated_data.pop('password', None)
        user = User(**validated_data)

        if password:
            user.set_password(password)

        user.save()
        return user

    def update(self, instance, validated_data):
        """
        Update user, handle password separately
        """
        password = validated_data.pop('password', None)

        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Only update password if provided
        if password:
            instance.set_password(password)

        instance.save()
        return instance