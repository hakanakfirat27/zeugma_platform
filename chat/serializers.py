from rest_framework import serializers
from .models import ChatMessage, ChatRoom
from accounts.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role']

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'receiver', 'sender_name', 'receiver_name',
                  'message', 'is_read', 'created_at', 'time']
        read_only_fields = ['sender']

    def get_sender_name(self, obj):
        return obj.sender.full_name or obj.sender.username

    def get_receiver_name(self, obj):
        return obj.receiver.full_name or obj.receiver.username

    def get_time(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at) + " ago"

class ChatRoomSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'other_user', 'last_message', 'last_message_time',
                  'unread_count', 'created_at']

    def get_other_user(self, obj):
        request_user = self.context['request'].user
        if request_user == obj.client:
            other = obj.admin
        else:
            other = obj.client
        return {
            'id': other.id,
            'username': other.username,
            'full_name': other.full_name or other.username,
            'email': other.email,
            'role': other.role
        }

    def get_unread_count(self, obj):
        request_user = self.context['request'].user
        if request_user == obj.client:
            return obj.unread_count_client
        else:
            return obj.unread_count_admin