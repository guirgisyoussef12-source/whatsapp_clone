import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await register(form)
    } catch (err) {
      setErrors(err || {})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="14" fill="var(--accent)" />
            <path d="M24 10C16.27 10 10 16.27 10 24c0 2.45.65 4.75 1.79 6.74L10 38l7.5-1.76A13.93 13.93 0 0024 38c7.73 0 14-6.27 14-14S31.73 10 24 10zm6.85 19.15c-.29.81-1.71 1.56-2.34 1.66-.6.09-1.35.13-2.18-.14a20.1 20.1 0 01-1.97-.73c-3.46-1.49-5.72-4.97-5.9-5.2-.17-.23-1.4-1.86-1.4-3.55 0-1.69.88-2.52 1.2-2.86.29-.31.64-.39.85-.39.21 0 .43.01.62.01.2 0 .47-.08.73.56.29.69.99 2.38 1.07 2.55.08.17.13.37.03.59-.1.23-.16.37-.31.57-.15.2-.32.44-.46.59-.15.17-.3.35-.13.68.17.32.77 1.27 1.66 2.06 1.14 1.02 2.1 1.34 2.43 1.49.32.15.51.13.7-.08.19-.21.82-.95 1.04-1.28.21-.32.43-.27.72-.16.3.11 1.89.89 2.21 1.05.32.16.53.24.61.37.08.13.08.74-.21 1.55z" fill="white" />
          </svg>
        </div>

        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Start chatting in seconds</p>

        {errors.non_field_errors && (
          <div className={styles.error}>{errors.non_field_errors}</div>
        )}

        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handle}
              placeholder="Choose a username"
              autoComplete="username"
              required
            />
            {errors.username && <span className={styles.fieldError}>{errors.username}</span>}
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handle}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handle}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}