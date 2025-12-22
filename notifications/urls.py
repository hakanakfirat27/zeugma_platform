from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet,
    get_vapid_public_key,
    subscribe_push,
    unsubscribe_push,
    list_push_subscriptions,
    delete_push_subscription,
    test_push_notification,
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('api/', include(router.urls)),
    
    # Push Notification URLs
    path('api/push/vapid-public-key/', get_vapid_public_key, name='vapid_public_key'),
    path('api/push/subscribe/', subscribe_push, name='push_subscribe'),
    path('api/push/unsubscribe/', unsubscribe_push, name='push_unsubscribe'),
    path('api/push/subscriptions/', list_push_subscriptions, name='push_subscriptions'),
    path('api/push/subscriptions/<uuid:subscription_id>/', delete_push_subscription, name='push_subscription_delete'),
    path('api/push/test/', test_push_notification, name='push_test'),
]