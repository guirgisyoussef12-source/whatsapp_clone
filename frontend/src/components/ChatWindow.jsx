import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { ChatSocket } from '../services/socket'
import Avatar from './Avatar'
import Message from './Message'
import styles from './ChatWindow.module.css'

function getChatName(chat, currentUser) {
  if (!chat) return ''
  if (chat.is_group) return chat.name || 'Group'
  const other = chat.members?.find((m) => m.user.id !== currentUser?.id)
  return other?.user?.username || 'Unknown'
}

export default function ChatWindow({ chats, onChatUpdated, onChatsRefresh }) {
  const { chatId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const chat = chats.find((c) => c.id === Number(chatId))
  const chatName = getChatName(chat, user)

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [typingUser, setTypingUser] = useState(null)
  const [sending, setSending] = useState(false)
  const [wsReady, setWsReady] = useState(false)

  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const typingTimerRef = useRef(null)
  const inputRef = useRef(null)

  // Load messages from REST
  useEffect(() => {
    setLoading(true)
    setMessages([])
    api.getMessages(chatId)
      .then((data) => setMessages(data.results ?? data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [chatId])

  // WebSocket
  useEffect(() => {
    socketRef.current?.close()
    setWsReady(false)

    const socket = new ChatSocket(
      chatId,
      // onMessage — received from server (confirmed + saved in DB)
      (msg) => {
        setMessages((prev) => {
          // Remove all temp/optimistic messages and the message if it already exists (by id)
          const filtered = prev.filter((m) => !m._temp && m.id !== msg.id)
          return [...filtered, msg]
        })
        onChatsRefresh()
      },
      // onTyping
      (data) => {
        if (data.user_id === user?.id) return
        setTypingUser(data.username)
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => setTypingUser(null), 2500)
      },
      // onClose
      (code) => {
        if (code === 4003) navigate('/')
      },
      // onOpen
      () => setWsReady(true)
    )

    socketRef.current = socket

    return () => {
      socket.close()
      clearTimeout(typingTimerRef.current)
    }
  }, [chatId])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser])

  // Mark messages as read
  useEffect(() => {
    const unread = messages
      .filter((m) => !m.is_read && m.sender?.id !== user?.id)
      .map((m) => m.id)
    if (unread.length > 0) api.markReadBulk(unread).catch(() => {})
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    // Optimistic update — show message immediately in UI
    const tempId = `temp_${Date.now()}`
    const optimistic = {
      id: tempId,
      _temp: tempId,
      content: text,
      sender: user,
      chat: Number(chatId),
      created_at: new Date().toISOString(),
      is_read: false,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      if (wsReady && socketRef.current?.ws?.readyState === WebSocket.OPEN) {
        // Send via WebSocket — server will broadcast back the real message
        socketRef.current.send(text)
      } else {
        // Fallback: send via REST API if WebSocket isn't ready
        const saved = await api.sendMessage(chatId, text)
        // Replace optimistic with real message
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)))
        onChatsRefresh()
      }
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setInput(text) // restore text
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    socketRef.current?.sendTyping()
  }

  const handleDelete = (msgId) => {
    api.deleteMessage(msgId)
      .then(() => setMessages((prev) => prev.filter((m) => m.id !== msgId)))
      .catch(() => {})
  }

  if (!chat && !loading) {
    return (
      <div className={styles.notFound}>
        <p>Chat not found.</p>
      </div>
    )
  }

  return (
    <div className={styles.window}>
      {/* Header */}
      <div className={styles.header}>
        <Avatar name={chatName} size={40} isGroup={chat?.is_group} />
        <div className={styles.headerInfo}>
          <span className={styles.chatName}>{chatName}</span>
          {typingUser ? (
            <span className={styles.typing}>{typingUser} is typing…</span>
          ) : (
            chat?.is_group && (
              <span className={styles.membersCount}>
                {chat.members?.length} members
              </span>
            )
          )}
        </div>
        {!wsReady && (
          <span className={styles.wsStatus}>Connecting…</span>
        )}
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {loading && (
          <div className={styles.loadingMessages}>
            <span>Loading messages…</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className={styles.noMessages}>
            No messages yet. Say hello! 👋
          </div>
        )}

        {messages.map((msg, i) => (
          <Message
            key={msg.id}
            msg={msg}
            isOwn={msg.sender?.id === user?.id}
            isTemp={!!msg._temp}
            showAvatar={
              !messages[i - 1] ||
              messages[i - 1].sender?.id !== msg.sender?.id
            }
            onDelete={handleDelete}
          />
        ))}

        {typingUser && (
          <div className={styles.typingBubble}>
            <span /><span /><span />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputBar}>
        <div className={styles.inputWrap}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="Type a message"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>
        <button
          className={`${styles.sendBtn} ${input.trim() ? styles.sendActive : ''}`}
          onClick={send}
          disabled={!input.trim() || sending}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}