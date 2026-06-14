from django.contrib import admin
from django.contrib.auth import get_user_model

User = get_user_model()

# The default UserAdmin already handles the built-in User model well.
# Re-register only if using a custom User model that isn't auto-registered.