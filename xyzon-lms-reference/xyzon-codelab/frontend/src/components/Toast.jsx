import React, { useState, useEffect, useCallback } from 'react'

// Simple global toast system
let toastFn = null
export function showToast(message, type = 'info') {
  if (toastFn) toastFn({ message, type, id: Date.now() })
}

export default function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    toastFn = (t) => {
      setToasts(prev => [...prev.slice(-3), t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000)
    }
    return () => { toastFn = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#fef2f2' : t.type === 'success' ? '#f0fdf4' : '#fff7ed',
          border: `1px solid ${t.type === 'error' ? '#fecaca' : t.type === 'success' ? '#bbf7d0' : '#fed7aa'}`,
          color: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : '#ea6c00',
          padding: '10px 16px', borderRadius: 10, fontFamily: 'var(--font-ui)',
          fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-md)',
          animation: 'toastIn 0.25s ease both',
          display: 'flex', alignItems: 'center', gap: 8, maxWidth: 340,
          minWidth: 220
        }}>
          <span>{t.type === 'error' ? '❌' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
