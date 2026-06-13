from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Chat, ChatMember, Message, Profile
from .serializers import (
    ChatSerializer,
    MessageSerializer,
    ProfileSerializer,
)


# =========================
# PROFILE VIEW
# =========================
class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.select_related("user")

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)

        if request.method == "PATCH":
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        return Response(self.get_serializer(profile).data)


# =========================
# CHAT VIEW
# =========================
class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Chat.objects.filter(members__user=self.request.user)
            .prefetch_related("members__user", "messages")
            .distinct()
        )

    def perform_create(self, serializer):
        member_ids = self.request.data.get("member_ids", [])

        if not isinstance(member_ids, list):
            member_ids = []

        chat = serializer.save()

        # add creator
        ChatMember.objects.get_or_create(chat=chat, user=self.request.user)

        # add other members safely
        users = User.objects.filter(id__in=member_ids).exclude(id=self.request.user.id)

        for user in users:
            ChatMember.objects.get_or_create(chat=chat, user=user)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        chat = self.get_object()

        messages = chat.messages.select_related("sender").all()

        return Response(MessageSerializer(messages, many=True).data)

    @action(detail=True, methods=["post"])
    def add_member(self, request, pk=None):
        chat = self.get_object()

        if not chat.is_group:
            return Response(
                {"detail": "Cannot add members to private chat."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # optional security: only members can add others
        if not ChatMember.objects.filter(chat=chat, user=request.user).exists():
            return Response(
                {"detail": "Not allowed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")

        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        ChatMember.objects.get_or_create(chat=chat, user=user)

        return Response(ChatSerializer(chat).data)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        chat = self.get_object()

        ChatMember.objects.filter(chat=chat, user=request.user).delete()

        # optional: delete empty chat
        if chat.members.count() == 0:
            chat.delete()

        return Response({"detail": "Left chat."}, status=status.HTTP_204_NO_CONTENT)


# =========================
# MESSAGE VIEW
# =========================
class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Message.objects.filter(chat__members__user=self.request.user)
            .select_related("sender", "chat")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        chat_id = self.request.data.get("chat")

        chat = Chat.objects.filter(
            id=chat_id,
            members__user=self.request.user
        ).first()

        if not chat:
            raise PermissionError("Chat not found or access denied.")

        serializer.save(sender=self.request.user, chat=chat)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()

        # optional: only chat members can mark read
        if not message.chat.members.filter(user=request.user).exists():
            return Response(
                {"detail": "Not allowed."},
                status=status.HTTP_403_FORBIDDEN,
            )

        message.is_read = True
        message.save()

        return Response(MessageSerializer(message).data)

    def destroy(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender != request.user:
            return Response(
                {"detail": "You can only delete your own messages."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)