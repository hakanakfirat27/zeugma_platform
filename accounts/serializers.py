from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from .models import LoginHistory

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for User data with computed fields
    """
    full_name = serializers.CharField(read_only=True)
    initials = serializers.CharField(read_only=True)
    password_expired = serializers.SerializerMethodField()
    days_until_password_expires = serializers.SerializerMethodField()

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
            'last_activity',
            # 2FA fields
            'two_factor_enabled',
            'is_2fa_setup_required',
            'login_count',
            'last_login_ip',
            # Password fields
            'password_changed_at',
            'password_expired',
            'days_until_password_expires',
        ]
        read_only_fields = fields
    
    def get_password_expired(self, obj):
        """Check if user's password has expired"""
        return obj.is_password_expired()
    
    def get_days_until_password_expires(self, obj):
        """Get days until password expires (None if never)"""
        return obj.days_until_password_expires()

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

    def validate_email(self, value):
        """
        Check that email is unique (case-insensitive)
        """
        # Normalize email to lowercase
        email = value.lower().strip()

        # Check if this is an update operation
        if self.instance:
            # Exclude current user from uniqueness check
            if User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError(
                    "An account with this email already exists. Only one user can be registered per email address. "
                    "Please use a different email or contact support if you need assistance."
                )
        else:
            # For new users, check if email exists
            if User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError(
                    "An account with this email already exists. Only one user can be registered per email address. "
                    "Please use a different email or contact support if you need assistance."
                )

        return email

    def validate_username(self, value):
        """
        Check that username is unique (case-insensitive) and meets requirements
        """
        # Normalize username to lowercase
        username = value.lower().strip()

        # Check length
        if len(username) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")

        if len(username) > 30:
            raise serializers.ValidationError("Username must not exceed 30 characters.")

        # Check if this is an update operation
        if self.instance:
            # Exclude current user from uniqueness check
            if User.objects.filter(username__iexact=username).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError("A user with that username already exists.")
        else:
            # For new users, check if username exists
            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError("A user with that username already exists.")

        return username

    def create(self, validated_data):
        """
        Create a new user with encrypted password and properly assigned role
        """
        password = validated_data.pop('password', None)

        # Ensure email and username are lowercase
        validated_data['email'] = validated_data['email'].lower().strip()
        validated_data['username'] = validated_data['username'].lower().strip()

        # Create user instance
        user = User(**validated_data)

        # Set password if provided
        if password:
            user.set_password(password)
        else:
            # If no password provided, set unusable password (for email-based password creation)
            user.set_unusable_password()

        # Ensure role is properly set (don't rely on default)
        if 'role' not in validated_data or not validated_data.get('role'):
            user.role = 'GUEST'

        # Save the user
        user.save()

        return user

    def update(self, instance, validated_data):
        """
        Update user, handle password separately, and ensure role is updated
        """
        password = validated_data.pop('password', None)

        # Normalize email and username if they're being updated
        if 'email' in validated_data:
            validated_data['email'] = validated_data['email'].lower().strip()
        if 'username' in validated_data:
            validated_data['username'] = validated_data['username'].lower().strip()

        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Only update password if provided
        if password:
            instance.set_password(password)

        instance.save()
        return instance


class LoginHistorySerializer(serializers.ModelSerializer):
    """Serializer for login history"""
    user_display = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = LoginHistory
        fields = ['id', 'user', 'user_display', 'login_time', 'ip_address', 'user_agent', 'success']
        read_only_fields = ['id', 'login_time']