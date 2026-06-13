from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Chat, ChatMember, Message, Profile


User = get_user_model()


class ChatModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ahmed",
            email="ahmed@example.com",
            password="pass12345",
        )
        self.other_user = User.objects.create_user(
            username="sara",
            email="sara@example.com",
            password="pass12345",
        )

    def test_profile_string_uses_username(self):
        profile = Profile.objects.create(user=self.user)
        self.assertEqual(str(profile), "ahmed")

    def test_chat_member_is_unique_per_chat(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.user)

        with self.assertRaises(IntegrityError):
            ChatMember.objects.create(chat=chat, user=self.user)

    def test_message_string_is_sender_and_preview(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.user)
        message = Message.objects.create(
            chat=chat,
            sender=self.user,
            content="Hello there!",
        )

        self.assertEqual(str(message), "ahmed: Hello there!")


class ChatApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ahmed",
            email="ahmed@example.com",
            password="pass12345",
        )
        self.other_user = User.objects.create_user(
            username="sara",
            email="sara@example.com",
            password="pass12345",
        )
        self.outsider = User.objects.create_user(
            username="mona",
            email="mona@example.com",
            password="pass12345",
        )
        self.client.force_authenticate(self.user)

    def test_create_private_chat_with_member(self):
        response = self.client.post(
            "/api/chat/chats/",
            {"is_group": False, "member_ids": [self.other_user.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        chat = Chat.objects.get(id=response.data["id"])
        self.assertEqual(chat.members.count(), 2)

    def test_group_chat_requires_name(self):
        response = self.client.post(
            "/api/chat/chats/",
            {"is_group": True, "member_ids": [self.other_user.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_send_message_to_own_chat(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.user)
        ChatMember.objects.create(chat=chat, user=self.other_user)

        response = self.client.post(
            "/api/chat/messages/",
            {"chat_id": chat.id, "content": "Hello"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(Message.objects.first().sender, self.user)

    def test_cannot_send_message_to_chat_without_membership(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.outsider)

        response = self.client.post(
            "/api/chat/messages/",
            {"chat_id": chat.id, "content": "No access"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Message.objects.count(), 0)

    def test_cannot_delete_another_users_message(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.user)
        ChatMember.objects.create(chat=chat, user=self.other_user)
        message = Message.objects.create(
            chat=chat,
            sender=self.other_user,
            content="Keep this",
        )

        response = self.client.delete(f"/api/chat/messages/{message.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Message.objects.filter(id=message.id).exists())


class AuthApiTests(APITestCase):
    def test_register_creates_user_and_profile(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "ahmed",
                "email": "ahmed@example.com",
                "password": "pass12345",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="ahmed")
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_login_returns_tokens(self):
        User.objects.create_user(
            username="ahmed",
            email="ahmed@example.com",
            password="pass12345",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"username": "ahmed", "password": "pass12345"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)