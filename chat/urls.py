from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatViewSet, MessageViewSet, ProfileViewSet


router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("chats", ChatViewSet, basename="chat")
router.register("messages", MessageViewSet, basename="message")

urlpatterns = [
    path("", include(router.urls)),
]