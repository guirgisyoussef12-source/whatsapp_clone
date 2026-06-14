# WhatsApp Clone — Frontend

React + Vite frontend for the WhatsApp Clone Django backend.

## Tech Stack

- React 18
- React Router v6
- Vite (dev server + bundler)
- CSS Modules (no external UI library)
- Native WebSocket API

## Setup

Make sure the Django backend is running on `http://localhost:8001`.

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

App runs on:

```
http://localhost:3000
```

Vite proxies `/api` and `/ws` to `http://localhost:8001` automatically — no CORS issues in development.

## Project Structure

```
src/
├── components/
│   ├── Avatar.jsx            # Colored initials avatar
│   ├── ChatWindow.jsx        # Main chat area with WebSocket
│   ├── ChatWindow.module.css
│   ├── Message.jsx           # Single message bubble
│   ├── Message.module.css
│   ├── NewChatModal.jsx      # Create private / group chat
│   ├── NewChatModal.module.css
│   ├── Sidebar.jsx           # Chat list + search + header
│   └── Sidebar.module.css
├── context/
│   └── AuthContext.jsx       # Global auth state (user, login, logout)
├── pages/
│   ├── AuthPage.module.css   # Shared auth styles
│   ├── ChatPage.jsx          # Main layout: sidebar + chat window
│   ├── ChatPage.module.css
│   ├── LoginPage.jsx
│   └── RegisterPage.jsx
├── services/
│   ├── api.js                # All HTTP calls (JWT, auto-refresh)
│   └── socket.js             # WebSocket wrapper
├── App.jsx                   # Router + protected routes
├── index.css                 # Global CSS variables + base styles
└── main.jsx                  # React entry point
```

## Features

- JWT login / register with auto token refresh
- Chat list with search and last message preview
- Real-time messaging via WebSocket
- Typing indicator
- Message read receipts (✓ / ✓✓)
- Delete your own messages
- Group and private chat support
- WhatsApp-style dark UI with green accents

## Backend Note

The "Add member by username" feature in NewChatModal requires a user-search endpoint on the backend:

```
GET /api/users/?username=<query>
```

Add this to your Django backend to enable full member lookup.