import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import NewChatModal from '../components/NewChatModal'
import styles from './ChatPage.module.css'

export default function ChatPage() {
  const [chats, setChats] = useState([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const navigate = useNavigate()

  const fetchChats = async () => {
    try {
      const data = await api.getChats()
      setChats(data.results ?? data)
    } catch {
      // ignore
    } finally {
      setLoadingChats(false)
    }
  }

  useEffect(() => { fetchChats() }, [])

  const onChatCreated = (chat) => {
    setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)])
    setShowNewChat(false)
    navigate(`/chat/${chat.id}`)
  }

  const onChatUpdated = (chat) => {
    setChats((prev) => prev.map((c) => (c.id === chat.id ? chat : c)))
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        chats={chats}
        loading={loadingChats}
        onNewChat={() => setShowNewChat(true)}
      />

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<EmptyState />} />
          <Route
            path="/chat/:chatId"
            element={
              <ChatWindow
                chats={chats}
                onChatUpdated={onChatUpdated}
                onChatsRefresh={fetchChats}
              />
            }
          />
        </Routes>
      </main>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={onChatCreated}
        />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyInner}>
        <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="14" fill="var(--accent-light)" />
          <path d="M24 10C16.27 10 10 16.27 10 24c0 2.45.65 4.75 1.79 6.74L10 38l7.5-1.76A13.93 13.93 0 0024 38c7.73 0 14-6.27 14-14S31.73 10 24 10z" fill="var(--accent)" />
        </svg>
        <h2>WhatsApp Clone</h2>
        <p>Select a chat to start messaging</p>
      </div>
    </div>
  )
}