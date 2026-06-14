import os
import django
from django.core.asgi import get_asgi_application

# 1. تحديد ملف الإعدادات الخاص بـ Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat_app.settings')

# 2. تهيئة وتجهيز تطبيق Django ASGI أولاً لتحميل التطبيقات
django_asgi_app = get_asgi_application()

# 3. الآن يمكنك بأمان استيراد مكونات Channels وملفات الـ routing الخاصة بك
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat.routing import websocket_urlpatterns  # تم نقل الاستيراد إلى هنا

# 4. تعريف التطبيق الرئيسي (ProtocolTypeRouter)
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})