import React, { useState } from 'react'
import styles from './Message.module.css'

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Message({ msg, isOwn, isTemp, showAvatar, onDelete }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className={`${styles.row} ${isOwn ? styles.own : styles.other} fade-in`}
      style={isTemp ? { opacity: 0.6 } : {}}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isOwn && showAvatar && (
        <div className={styles.senderLabel}>{msg.sender?.username}</div>
      )}

      <div className={`${styles.bubble} ${isOwn ? styles.bubbleOut : styles.bubbleIn}`}>
        <span className={styles.content}>{msg.content}</span>
        <div className={styles.meta}>
          <span className={styles.time}>{formatTime(msg.created_at)}</span>
          {isOwn && (
            <span className={styles.readTick} title={msg.is_read ? 'Read' : 'Sent'}>
              {msg.is_read ? (
                // Double tick blue
                <svg width="16" height="10" viewBox="0 0 16 10" fill="var(--accent)">
                  <path d="M1 5l4 4L14 1M5 5l4 4"/>
                </svg>
              ) : (
                // Single tick grey
                <svg width="12" height="10" viewBox="0 0 12 10" fill="var(--text-muted)">
                  <path d="M1 5l4 4L11 1"/>
                </svg>
              )}
            </span>
          )}
        </div>

        {isOwn && hover && (
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(msg.id)}
            title="Delete message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}