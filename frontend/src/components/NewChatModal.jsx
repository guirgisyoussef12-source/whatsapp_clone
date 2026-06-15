import React, { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import Avatar from './Avatar'
import styles from './NewChatModal.module.css'

export default function NewChatModal({ onClose, onCreated }) {
  const [tab, setTab] = useState('private')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)

  // Live user search with debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query)
        setResults(users)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [query])

  const resetSearch = () => {
    setQuery('')
    setResults([])
    setSelectedUser(null)
    setError('')
  }

  const createPrivate = async () => {
    if (!selectedUser) { setError('Search and select a user first.'); return }
    setLoading(true)
    setError('')
    try {
      const chat = await api.createChat({
        is_group: false,
        member_ids: [selectedUser.id],
      })
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
        member_ids: selectedUser ? [selectedUser.id] : [],
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
            onClick={() => { setTab('private'); resetSearch() }}
          >Private</button>
          <button
            className={`${styles.tab} ${tab === 'group' ? styles.tabActive : ''}`}
            onClick={() => { setTab('group'); resetSearch() }}
          >Group</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          {tab === 'group' && (
            <div className={styles.field}>
              <label>Group name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Team Alpha"
              />
            </div>
          )}

          {/* User search */}
          <div className={styles.field}>
            <label>{tab === 'private' ? 'Find user' : 'Add member (optional)'}</label>

            {selectedUser ? (
              <div className={styles.selectedUser}>
                <Avatar name={selectedUser.username} size={32} />
                <span>{selectedUser.username}</span>
                <button className={styles.removeUser} onClick={resetSearch}>✕</button>
              </div>
            ) : (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a username to search…"
                  autoComplete="off"
                />
                {(results.length > 0 || searching) && (
                  <div className={styles.dropdown}>
                    {searching && <div className={styles.dropdownItem} style={{ color: 'var(--text-muted)' }}>Searching…</div>}
                    {!searching && results.length === 0 && (
                      <div className={styles.dropdownItem} style={{ color: 'var(--text-muted)' }}>No users found</div>
                    )}
                    {results.map((u) => (
                      <button
                        key={u.id}
                        className={styles.dropdownItem}
                        onClick={() => { setSelectedUser(u); setQuery(''); setResults([]) }}
                      >
                        <Avatar name={u.username} size={28} />
                        <span>{u.username}</span>
                        <span className={styles.userEmail}>{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.createBtn}
            onClick={submit}
            disabled={loading || (tab === 'private' && !selectedUser)}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}