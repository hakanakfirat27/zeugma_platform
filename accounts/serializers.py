from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display')
    last_login_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'initials', 'role', 'role_display',
            'is_active', 'last_login', 'last_login_display', 'date_joined'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_initials(self, obj):
        first = obj.first_name[0] if obj.first_name else ''
        last = obj.last_name[0] if obj.last_name else ''
        return (first + last).upper() or obj.username[0].upper()

    def get_last_login_display(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M:%S')
        return None

# --- NEW SERIALIZER FOR USER MANAGEMENT ---
# This serializer is used by staff to create and update users.
class UserManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'password'
        ]
        # Password is write-only for security, it won't be sent back in responses.
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def create(self, validated_data):
        # Hash the password when creating a new user.
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Hash the password if it's being updated.
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)