import React, { useState } from 'react'
import { api } from '../services/api'
import styles from './NewChatModal.module.css'

export default function NewChatModal({ onClose, onCreated }) {
  const [tab, setTab] = useState('private') // 'private' | 'group'
  const [username, setUsername] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resolveUserIds = async (usernamesStr) => {
    // We'll use the chats list to find user IDs by creating a temp approach
    // Since the backend doesn't have a user-search endpoint, we create the chat
    // with member_ids. For now we use a simple approach via the register endpoint
    // to surface a friendly error.
    // In a real app you'd add GET /api/users/?search= endpoint.
    const names = usernamesStr.split(',').map((s) => s.trim()).filter(Boolean)
    if (names.length === 0) throw new Error('Enter at least one username.')
    // Return names as-is; backend will validate member_ids
    return names
  }

  const createPrivate = async () => {
    if (!username.trim()) { setError('Enter a username.'); return }
    setLoading(true)
    setError('')
    try {
      // We need the user_id. Since there's no search endpoint, we create
      // a private chat with member username lookup via a helper:
      const chat = await api.createChat({
        is_group: false,
        member_usernames: [username.trim()], // backend ignores this gracefully
        member_ids: [],                       // will be empty; see note below
      })
      // NOTE: Your backend uses member_ids not usernames.
      // Ideally add GET /api/users/?username= to your Django backend.
      // For now this creates a chat without the other member.
      onCreated(chat)
    } catch (err) {
      setError(err?.detail || JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async () => {
    if (!groupName.trim()) { setError('Enter a group name.'); return }
    setLoading(true)
    setError('')
    try {
      const chat = await api.createChat({
        is_group: true,
        name: groupName.trim(),
        member_ids: [],
      })
      onCreated(chat)
    } catch (err) {
      setError(err?.detail || err?.name?.[0] || JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  const submit = tab === 'private' ? createPrivate : createGroup

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>New chat</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'private' ? styles.tabActive : ''}`}
            onClick={() => { setTab('private'); setError('') }}
          >
            Private
          </button>
          <button
            className={`${styles.tab} ${tab === 'group' ? styles.tabActive : ''}`}
            onClick={() => { setTab('group'); setError('') }}
          >
            Group
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {tab === 'private' ? (
          <div className={styles.body}>
            <p className={styles.hint}>
              💡 To add members by ID, ask your backend developer to add a user-search endpoint.
            </p>
            <div className={styles.field}>
              <label>Username (for reference)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ahmed"
              />
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.field}>
              <label>Group name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Team Alpha"
              />
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.createBtn} onClick={submit} disabled={loading}>
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}