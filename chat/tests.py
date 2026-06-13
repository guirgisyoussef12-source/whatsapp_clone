from django.contrib.auth.models import User
from django.test import TestCase

from .models import Chat, ChatMember, Message, Profile


class ProfileModelTests(TestCase):
    def test_profile_str(self):
        user = User.objects.create_user(username='ahmed', password='pass12345')
        profile = Profile.objects.create(user=user)
        self.assertEqual(str(profile), 'ahmed')
        self.assertFalse(profile.is_online)

    def test_profile_default_values(self):
        user = User.objects.create_user(username='sara', password='pass12345')
        profile = Profile.objects.create(user=user)
        self.assertEqual(profile.bio, '')
        self.assertIsNone(profile.avatar.name) if profile.avatar else None


class ChatModelTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='ahmed', password='pass12345')
        self.user2 = User.objects.create_user(username='sara', password='pass12345')
        self.user3 = User.objects.create_user(username='mona', password='pass12345')

    def test_create_one_to_one_chat(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.user1)
        ChatMember.objects.create(chat=chat, user=self.user2)

        self.assertFalse(chat.is_group)
        self.assertEqual(chat.members.count(), 2)
        self.assertEqual(str(chat), f"Chat {chat.pk}")

    def test_create_group_chat(self):
        chat = Chat.objects.create(name='Friends Group', is_group=True)
        ChatMember.objects.create(chat=chat, user=self.user1)
        ChatMember.objects.create(chat=chat, user=self.user2)
        ChatMember.objects.create(chat=chat, user=self.user3)

        self.assertTrue(chat.is_group)
        self.assertEqual(chat.name, 'Friends Group')
        self.assertEqual(chat.members.count(), 3)
        self.assertEqual(str(chat), 'Friends Group')

    def test_group_chat_without_name(self):
        chat = Chat.objects.create(is_group=True)
        self.assertEqual(str(chat), f"Group {chat.pk}")

    def test_chat_member_unique_together(self):
        chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=chat, user=self.user1)

        with self.assertRaises(Exception):
            ChatMember.objects.create(chat=chat, user=self.user1)

    def test_chat_member_str(self):
        chat = Chat.objects.create(is_group=False)
        member = ChatMember.objects.create(chat=chat, user=self.user1)
        self.assertIn('ahmed', str(member))


class MessageModelTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='ahmed', password='pass12345')
        self.user2 = User.objects.create_user(username='sara', password='pass12345')

        self.chat = Chat.objects.create(is_group=False)
        ChatMember.objects.create(chat=self.chat, user=self.user1)
        ChatMember.objects.create(chat=self.chat, user=self.user2)

    def test_create_message(self):
        msg = Message.objects.create(chat=self.chat, sender=self.user1, content="Hello!")
        self.assertEqual(msg.content, "Hello!")
        self.assertFalse(msg.is_read)
        self.assertEqual(msg.sender, self.user1)
        self.assertEqual(msg.chat, self.chat)

    def test_message_str(self):
        msg = Message.objects.create(chat=self.chat, sender=self.user1, content="Hello there!")
        self.assertEqual(str(msg), "ahmed: Hello there!")

    def test_mark_message_as_read(self):
        msg = Message.objects.create(chat=self.chat, sender=self.user1, content="Read me")
        msg.is_read = True
        msg.save()

        msg.refresh_from_db()
        self.assertTrue(msg.is_read)

    def test_messages_belong_to_chat(self):
        Message.objects.create(chat=self.chat, sender=self.user1, content="msg1")
        Message.objects.create(chat=self.chat, sender=self.user2, content="msg2")

        self.assertEqual(self.chat.messages.count(), 2)

    def test_message_ordering_by_creation(self):
        m1 = Message.objects.create(chat=self.chat, sender=self.user1, content="first")
        m2 = Message.objects.create(chat=self.chat, sender=self.user2, content="second")
        m3 = Message.objects.create(chat=self.chat, sender=self.user1, content="third")

        messages = list(self.chat.messages.all())
        self.assertEqual(messages, [m1, m2, m3])

    def test_deleting_chat_deletes_messages(self):
        Message.objects.create(chat=self.chat, sender=self.user1, content="bye")
        self.chat.delete()
        self.assertEqual(Message.objects.count(), 0)

    def test_deleting_user_deletes_their_messages(self):
        Message.objects.create(chat=self.chat, sender=self.user1, content="will be deleted")
        self.user1.delete()
        self.assertEqual(Message.objects.count(), 0)