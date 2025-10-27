"""
ASGI config for zeugma_core project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import re_path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zeugma_core.settings')

django_asgi_app = get_asgi_application()

# Import BOTH consumers
from chat import consumers as chat_consumers
from notifications import consumers as notification_consumers
from accounts import consumers as accounts_consumers

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_id>[^/]+)/$', chat_consumers.ChatConsumer.as_asgi()),
    # --- 2. ADD THE NOTIFICATION ROUTE ---
    re_path(r'ws/notifications/$', notification_consumers.NotificationConsumer.as_asgi()),
    re_path(r'ws/user-status/$', accounts_consumers.UserStatusConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})