# your_app/routing.py
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from map_app.consumers import YourConsumer
from django.urls import path


application = ProtocolTypeRouter({
    "websocket": AuthMiddlewareStack(
        URLRouter(
            [
                path("ws/maxar-update/", YourConsumer.as_asgi()),
            ]
        )
    ),
})
