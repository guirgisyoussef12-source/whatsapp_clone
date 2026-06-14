# WhatsApp Clone API

A Django REST + WebSocket backend for authentication, user profiles, chats, and real-time messaging.

## Stack

- Django 5 + Django REST Framework
- Django Channels + Daphne (WebSocket / ASGI)
- PostgreSQL (primary database)
- Redis (channel layer for real-time delivery)
- JWT authentication (SimpleJWT)
- Docker Compose

## Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Make sure the values in `.env` match `docker-compose.yml`:

```env
SECRET_KEY=change-me-in-production
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=whatsapp_clone
DB_USER=postgres
DB_PASSWORD=guirgis
DB_HOST=db
DB_PORT=5432

REDIS_HOST=redis
REDIS_PORT=6379

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Start all services:

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

```
http://localhost:8001
```

Swagger UI (interactive docs):

```
http://localhost:8001/api/docs/
```

## REST API Endpoints

### Authentication

```
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/refresh/
GET  /api/auth/me/
```

### Chat

```
GET    /api/chat/profiles/me/
PATCH  /api/chat/profiles/me/

GET    /api/chat/chats/
POST   /api/chat/chats/
GET    /api/chat/chats/{id}/
PATCH  /api/chat/chats/{id}/
GET    /api/chat/chats/{id}/messages/
POST   /api/chat/chats/{id}/add_member/
POST   /api/chat/chats/{id}/leave/

GET    /api/chat/messages/
POST   /api/chat/messages/
POST   /api/chat/messages/{id}/mark_read/
POST   /api/chat/messages/mark_read_bulk/
DELETE /api/chat/messages/{id}/
```

Use the JWT access token as a Bearer token:

```http
Authorization: Bearer <access_token>
```

## WebSocket

Connect to a chat room:

```
ws://localhost:8001/ws/chats/{chat_id}/?token=<access_token>
```

The server closes the connection with the following codes if authentication fails:

| Code | Reason |
|------|--------|
| 4001 | Missing token |
| 4002 | Invalid or expired token |
| 4003 | User is not a member of this chat |

### Send a message

```json
{"type": "message", "content": "Hello!"}
```

The server saves the message to the database and broadcasts it to all connected members:

```json
{
  "type": "message",
  "message": {
    "id": 1,
    "chat": 1,
    "sender": {"id": 1, "username": "ahmed", "email": "ahmed@example.com"},
    "content": "Hello!",
    "created_at": "2026-06-14T10:00:00Z",
    "is_read": false
  }
}
```

### Typing indicator

```json
{"type": "typing"}
```

Broadcasts to other members (not saved to DB):

```json
{"type": "typing", "user_id": 1, "username": "ahmed"}
```

## Roadmap

- [ ] Unread message count per chat
- [ ] Search messages
- [ ] File / image attachments
- [ ] Push notifications