
from rest_framework import serializers

from authentication.serializers import UserSerializer
from .models import Chat, ChatMember, Message, Profile


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "avatar",
            "bio",
            "is_online",
            "last_seen",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_online",
            "last_seen",
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "content",
            "created_at",
            "is_read",
        ]
        read_only_fields = [
            "id",
            "sender",
            "created_at",
            "is_read",
        ]

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message content cannot be empty."
            )

        return value


class LastMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "content",
            "created_at",
        ]
        read_only_fields = fields


class ChatMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ChatMember
        fields = [
            "id",
            "user",
            "joined_at",
        ]
        read_only_fields = fields


class ChatSerializer(serializers.ModelSerializer):
    members = ChatMemberSerializer(
        many=True,
        read_only=True,
    )

    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id",
            "name",
            "is_group",
            "created_at",
            "members",
            "last_message",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "members",
            "last_message",
        ]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()

        if last is None:
            return None

        return LastMessageSerializer(last).data

    def validate(self, attrs):
        if attrs.get("is_group"):
            name = attrs.get("name", "").strip()

            if not name:
                raise serializers.ValidationError(
                    {
                        "name": "Group chats must have a name."
                    }
                )

        return attrs
