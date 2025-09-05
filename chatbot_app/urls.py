from django.urls import path
from .views import *

urlpatterns = [
    path(
        "get-prompt-response/<str:user_id>/<str:chat_id>/<int:mode>",
        get_prompt_response,
        name="get-prompt-response",
    ),
    path(
        "get-chat-history/<str:user_id>/<str:chat_id>",
        get_chat_history,
        name="get-chat-history",
    ),
    path(
        "get-recent-chat-id/<str:user_id>/<int:chat_mode>",
        get_recent_chat_id,
        name="get-recent-chat-id",
    ),
    path(
        "clear-chat-conversation-log/<str:user_id>",
        clear_chat_conversation_log,
        name="clear-chat-conversation-log",
    ),
    path(
        "list-conversations/<str:user_id>",
        list_conversations,
        name="list-conversations",
    ),
    path(
        "delete-conversation/<str:user_id>/<str:chat_id>",
        delete_conversation,
        name="delete_conversation",
    ),
]
