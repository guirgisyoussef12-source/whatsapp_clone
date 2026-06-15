from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from chat.models import Profile
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        Profile.objects.get_or_create(user=user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserSearchView(APIView):
    """
    GET /api/auth/users/?username=ahmed
    Returns users matching the query, excluding the requesting user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("username", "").strip()
        if not query:
            return Response([])
        users = (
            User.objects.filter(username__icontains=query)
            .exclude(id=request.user.id)[:10]
        )
        return Response(UserSerializer(users, many=True).data)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]