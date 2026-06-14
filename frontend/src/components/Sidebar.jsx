import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import styles from './Sidebar.module.css'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getChatName(chat, currentUser) {
  if (chat.is_group) return chat.name || 'Group'
  const other = chat.members?.find((m) => m.user.id !== currentUser?.id)
  return other?.user?.username || 'Unknown'
}

export default function Sidebar({ chats, loading, onNewChat }) {
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()

  const filtered = chats.filter((c) => {
    const name = getChatName(c, user).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Avatar name={user?.username} size={38} />
          <span className={styles.username}>{user?.username}</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={onNewChat} title="New chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              <path d="M11 7h2v5h-2zm0 6h2v2h-2z" opacity=".6"/>
            </svg>
          </button>
          <div className={styles.menuWrap}>
            <button className={styles.iconBtn} onClick={() => setShowMenu((v) => !v)} title="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {showMenu && (
              <div className={styles.dropdown}>
                <button onClick={handleLogout} className={styles.dropdownItem}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            placeholder="Search chats"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chat list */}
      <div className={styles.list}>
        {loading && (
          <div className={styles.loading}>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>
            {search ? 'No chats found' : 'No chats yet. Start one!'}
          </div>
        )}

        {!loading && filtered.map((chat) => (
          <ChatRow key={chat.id} chat={chat} currentUser={user} />
        ))}
      </div>
    </aside>
  )
}

function ChatRow({ chat, currentUser }) {
  const name = getChatName(chat, currentUser)
  const last = chat.last_message
  const lastText = last?.content || ''
  const lastTime = last?.created_at ? formatTime(last.created_at) : ''
  const isMine = last?.sender?.id === currentUser?.id

  return (
    <NavLink
      to={`/chat/${chat.id}`}
      className={({ isActive }) =>
        `${styles.chatRow} ${isActive ? styles.active : ''}`
      }
    >
      <Avatar name={name} size={46} isGroup={chat.is_group} />
      <div className={styles.chatInfo}>
        <div className={styles.chatTop}>
          <span className={styles.chatName}>{name}</span>
          {lastTime && <span className={styles.chatTime}>{lastTime}</span>}
        </div>
        <div className={styles.chatBottom}>
          <span className={styles.chatLast}>
            {isMine && <span className={styles.youLabel}>You: </span>}
            {lastText || <em>No messages yet</em>}
          </span>
        </div>
      </div>
    </NavLink>
  )
}

function SkeletonRow() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonAvatar} />
      <div className={styles.skeletonLines}>
        <div className={styles.skeletonLine} style={{ width: '60%' }} />
        <div className={styles.skeletonLine} style={{ width: '80%', opacity: 0.5 }} />
      </div>
    </div>
  )
}