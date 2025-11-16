# chat/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'rooms', views.ChatRoomViewSet, basename='chatroom')
router.register(r'messages', views.ChatMessageViewSet, basename='chatmessage')
# router.register(r'typing', views.TypingStatusViewSet, basename='typingstatus') # If you have this

urlpatterns = [
    path('', include(router.urls)),
    # The path for mark_room_read is automatically handled by the router now
    # path('messages/mark_room_read/', views.mark_room_read, name='mark-room-read'), # <-- Make sure this line is removed
]