# WhatsApp Clone API

A Django REST backend for authentication, user profiles, chats, and messages.

## Current Scope

- JWT register, login, refresh, and current-user endpoints
- Authenticated profile endpoint
- Authenticated chat and message APIs
- PostgreSQL and Redis services through Docker Compose

Real-time messaging and caching are planned next. The REST API is the stable base they will build on.

## Setup

Copy the example environment file:

```bash
cp .env.example .env
```

For Docker, make sure the database values in `.env` match `docker-compose.yml`:

```env
DB_NAME=whatsapp_clone
DB_USER=postgres
DB_PASSWORD=guirgis
DB_HOST=db
DB_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
```

Start the services:

```bash
docker compose up --build
```

Run migrations:

```bash
docker compose exec web python manage.py migrate
```

Run tests:

```bash
docker compose exec web python manage.py test
```

The API runs on:

```text
http://localhost:8001
```

## API Endpoints

Authentication:

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/refresh/
GET  /api/auth/me/
```

Chat:

```text
GET    /api/chat/profiles/me/
PATCH  /api/chat/profiles/me/
GET    /api/chat/chats/
POST   /api/chat/chats/
GET    /api/chat/chats/{id}/
GET    /api/chat/chats/{id}/messages/
POST   /api/chat/chats/{id}/add_member/
POST   /api/chat/chats/{id}/leave/
GET    /api/chat/messages/
POST   /api/chat/messages/
POST   /api/chat/messages/{id}/mark_read/
DELETE /api/chat/messages/{id}/
```

Use the JWT access token as a bearer token:

```http
Authorization: Bearer <access_token>
```

## Roadmap

1. Stabilize REST chat APIs and permissions.
2. Add API tests for auth, chat creation, message creation, and access denial.
3. Add Django Channels for WebSocket real-time messaging.
4. Add Redis channel layer for multi-process real-time delivery.
5. Add caching for chat lists, user presence, and profile reads.
6. Add pagination, search, read receipts, and typing indicators.
