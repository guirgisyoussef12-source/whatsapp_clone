from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import Chat, ChatMember, Message
from .serializers import MessageSerializer

User = get_user_model()


class ChatConsumer(AsyncJsonWebsocketConsumer):
    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @database_sync_to_async
    def _get_user_from_token(self, token_str):
        """Validate JWT token and return the User, or None on failure."""
        try:
            token = AccessToken(token_str)
            return User.objects.get(id=token["user_id"])
        except (InvalidToken, TokenError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def _is_chat_member(self, chat_id, user):
        """Return True if the user is a member of the given chat."""
        return ChatMember.objects.filter(chat_id=chat_id, user=user).exists()

    @database_sync_to_async
    def _save_message(self, chat_id, user, content):
        """Persist message to DB and return serialized data."""
        chat = Chat.objects.get(id=chat_id)
        message = Message.objects.create(chat=chat, sender=user, content=content)
        # Mark as from WebSocket to avoid double broadcasting
        message._from_websocket = True
        # Update chat.updated_at so the chat list re-sorts correctly
        chat.save(update_fields=["updated_at"])
        return MessageSerializer(message).data

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def connect(self):
        """
        Authenticate via JWT passed as a query param:
            ws://host/ws/chats/1/?token=<access_token>
        Then verify the user is actually a member of that chat.
        """
        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        self.group_name = f"chat_{self.chat_id}"

        # 1. Extract token from query string
        query_string = self.scope.get("query_string", b"").decode()
        token_str = None
        for part in query_string.split("&"):
            if part.startswith("token="):
                token_str = part[len("token="):]
                break

        if not token_str:
            await self.close(code=4001)  # 4001 = missing token
            return

        # 2. Validate token and get user
        user = await self._get_user_from_token(token_str)
        if user is None:
            await self.close(code=4002)  # 4002 = invalid token
            return

        # 3. Check chat membership
        is_member = await self._is_chat_member(self.chat_id, user)
        if not is_member:
            await self.close(code=4003)  # 4003 = not a chat member
            return

        self.user = user

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ------------------------------------------------------------------
    # Receive from client
    # ------------------------------------------------------------------

    async def receive_json(self, content, **kwargs):
        """
        Expected payload:
            {"type": "message", "content": "Hello!"}
        """
        msg_type = content.get("type")
        text = (content.get("content") or "").strip()

        if msg_type == "message":
            if not text:
                await self.send_json({"type": "error", "detail": "Empty message."})
                return

            # Save to DB, then broadcast the full serialized message
            message_data = await self._save_message(self.chat_id, self.user, text)

            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat.message",
                    "payload": {"type": "message", "message": message_data},
                },
            )

        elif msg_type == "typing":
            # Broadcast typing indicator without saving to DB
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat.typing",
                    "payload": {
                        "type": "typing",
                        "user_id": self.user.id,
                        "username": self.user.username,
                    },
                },
            )

        else:
            await self.send_json({"type": "error", "detail": f"Unknown type: {msg_type}"})

    # ------------------------------------------------------------------
    # Group event handlers
    # ------------------------------------------------------------------

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    async def chat_typing(self, event):
        await self.send_json(event["payload"])