from rest_framework import serializers
from .models import ChatRoom, ChatMessage, TypingStatus
from accounts.models import User


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for chat"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    initials = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'initials', 'role']

    def get_initials(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name[0]}{obj.last_name[0]}".upper()
        return obj.username[0].upper()


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)
    time_ago = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'message_id', 'room', 'sender', 'message_type', 'content',
            'file', 'file_name', 'file_size', 'file_type', 'file_url',
            'is_read', 'read_at', 'created_at', 'time_ago'
        ]
        read_only_fields = ['message_id', 'sender', 'created_at', 'is_read', 'read_at']

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages with file upload"""

    class Meta:
        model = ChatMessage
        fields = ['room', 'message_type', 'content', 'file']

    def validate_file(self, value):
        if value:
            # Max file size: 10MB
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("File size cannot exceed 10MB")

            # Store file metadata
            return value
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['sender'] = request.user

        # Extract file metadata if file is present
        if 'file' in validated_data and validated_data['file']:
            file_obj = validated_data['file']
            validated_data['file_name'] = file_obj.name
            validated_data['file_size'] = file_obj.size
            validated_data['file_type'] = file_obj.content_type

        return super().create(validated_data)


class ChatRoomSerializer(serializers.ModelSerializer):
    client = UserMinimalSerializer(read_only=True)
    assigned_staff = UserMinimalSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'room_id', 'room_type', 'client', 'assigned_staff',
            'subject', 'is_active', 'created_at', 'updated_at',
            'last_message', 'unread_count'
        ]
        read_only_fields = ['room_id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.get_last_message()
        if last_msg:
            return {
                'content': last_msg.content[:100],
                'sender': last_msg.sender.username,
                'created_at': last_msg.created_at,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class TypingStatusSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = TypingStatus
        fields = ['room', 'user', 'is_typing', 'last_activity']
        read_only_fields = ['user', 'last_activity']