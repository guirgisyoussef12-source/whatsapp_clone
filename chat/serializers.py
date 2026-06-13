from django.contrib.auth import get_user_model
from rest_framework import serializers

from authentication.serializers import UserSerializer
from .models import Chat, ChatMember, Message, Profile


User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "user", "avatar", "bio", "is_online", "last_seen"]
        read_only_fields = ["id", "user", "is_online", "last_seen"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    chat = serializers.PrimaryKeyRelatedField(read_only=True)
    chat_id = serializers.IntegerField(write_only=True, required=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "chat",
            "chat_id",
            "sender",
            "content",
            "created_at",
            "is_read",
        ]
        read_only_fields = ["id", "chat", "sender", "created_at", "is_read"]

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message content cannot be empty.")
        return value


class LastMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "content", "created_at"]
        read_only_fields = fields


class ChatMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ChatMember
        fields = ["id", "user", "joined_at"]
        read_only_fields = fields


class ChatSerializer(serializers.ModelSerializer):
    members = ChatMemberSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id",
            "name",
            "is_group",
            "created_at",
            "updated_at",
            "members",
            "member_ids",
            "last_message",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "members", "last_message"]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").select_related("sender").first()
        if last is None:
            return None
        return LastMessageSerializer(last).data

    def validate(self, attrs):
        is_group = attrs.get("is_group", getattr(self.instance, "is_group", False))
        name = attrs.get("name", getattr(self.instance, "name", "") or "")

        if is_group and not name.strip():
            raise serializers.ValidationError({"name": "Group chats must have a name."})

        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("member_ids", None)
        return super().update(instance, validated_data)