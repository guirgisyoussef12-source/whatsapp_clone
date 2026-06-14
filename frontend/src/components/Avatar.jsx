import React from 'react'

const COLORS = [
  '#e57373', '#f06292', '#ba68c8', '#7986cb',
  '#4fc3f7', '#4db6ac', '#81c784', '#ffb74d',
  '#ff8a65', '#a1887f', '#90a4ae', '#00a884',
]

function colorFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Avatar({ name = '', size = 40, isGroup = false }) {
  const initial = name ? name[0].toUpperCase() : '?'
  const bg = colorFor(name)
  const fontSize = Math.round(size * 0.38)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize,
        fontWeight: 700,
        color: '#fff',
        userSelect: 'none',
        letterSpacing: '-0.5px',
      }}
    >
      {isGroup ? (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="white">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ) : initial}
    </div>
  )
}