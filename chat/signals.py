from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Message
from .serializers import MessageSerializer


@receiver(post_save, sender=Message)
def broadcast_message(sender, instance, created, **kwargs):
    """Broadcast message to WebSocket group when created via REST API."""
    if not created:
        return  # Only broadcast on creation, not updates

    # Only broadcast if the message was created (not from WebSocket consumer)
    # We check if it has a _from_websocket flag to avoid double broadcasting
    if hasattr(instance, '_from_websocket') and instance._from_websocket:
        return

    channel_layer = get_channel_layer()
    group_name = f"chat_{instance.chat_id}"
    message_data = MessageSerializer(instance).data

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "chat.message",
            "payload": {"type": "message", "message": message_data},
        },
    )
