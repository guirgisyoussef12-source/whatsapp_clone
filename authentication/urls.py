from django.urls import path
from .views import RegisterView, MeView

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # register
    path("register/", RegisterView.as_view()),

    # login (JWT)
    path("login/", TokenObtainPairView.as_view()),

    # refresh token
    path("refresh/", TokenRefreshView.as_view()),

    # current user
    path("me/", MeView.as_view()),
]