from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Chat, ChatMember, Message, Profile
from .serializers import ChatSerializer, MessageSerializer, ProfileSerializer


User = get_user_model()


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Profile.objects.select_related("user").filter(user=self.request.user)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)

        if request.method == "PATCH":
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        return Response(self.get_serializer(profile).data)


class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Chat.objects.filter(members__user=self.request.user)
            .prefetch_related("members__user", "messages__sender")
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        """Override create to return existing private chat if one already exists."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member_ids = list(serializer.validated_data.get("member_ids", []))
        is_group = serializer.validated_data.get("is_group", False)

        # For private chats, check if a chat between these two users already exists
        if not is_group and len(member_ids) == 1:
            other_user_id = member_ids[0]
            existing = (
                Chat.objects.filter(is_group=False, members__user=request.user)
                .filter(members__user_id=other_user_id)
                .first()
            )
            if existing:
                out = self.get_serializer(existing)
                return Response(out.data, status=status.HTTP_200_OK)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @transaction.atomic
    def perform_create(self, serializer):
        member_ids = serializer.validated_data.pop("member_ids", [])
        chat = serializer.save()

        ChatMember.objects.create(chat=chat, user=self.request.user)

        users = User.objects.filter(id__in=set(member_ids)).exclude(id=self.request.user.id)
        members = [ChatMember(chat=chat, user=user) for user in users]
        ChatMember.objects.bulk_create(members, ignore_conflicts=True)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        chat = self.get_object()
        messages = chat.messages.select_related("sender").all()
        page = self.paginate_queryset(messages)

        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        return Response(MessageSerializer(messages, many=True).data)

    @action(detail=True, methods=["post"])
    def add_member(self, request, pk=None):
        chat = self.get_object()

        if not chat.is_group:
            return Response(
                {"detail": "Cannot add members to private chat."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = request.data.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "This field is required."})

        user = User.objects.filter(id=user_id).first()
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        ChatMember.objects.get_or_create(chat=chat, user=user)
        return Response(self.get_serializer(chat).data)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        chat = self.get_object()
        ChatMember.objects.filter(chat=chat, user=request.user).delete()

        if not chat.members.exists():
            chat.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return (
            Message.objects.filter(chat__members__user=self.request.user)
            .select_related("sender", "chat")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        chat_id = serializer.validated_data.pop("chat_id")
        chat = Chat.objects.filter(id=chat_id, members__user=self.request.user).first()

        if chat is None:
            raise PermissionDenied("Chat not found or access denied.")

        serializer.save(sender=self.request.user, chat=chat)
        chat.save(update_fields=["updated_at"])

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response(self.get_serializer(message).data)

    @action(detail=False, methods=["post"], url_path="mark_read_bulk")
    def mark_read_bulk(self, request):
        """
        Mark multiple messages as read in one request.
        Body: {"message_ids": [1, 2, 3]}
        """
        ids = request.data.get("message_ids", [])
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "Provide a non-empty list of message_ids."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = (
            Message.objects.filter(
                id__in=ids,
                chat__members__user=request.user,
            )
            .exclude(is_read=True)
            .update(is_read=True)
        )
        return Response({"updated": updated})

    def destroy(self, request, *args, **kwargs):
        message = self.get_object()

        if message.sender_id != request.user.id:
            return Response(
                {"detail": "You can only delete your own messages."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)