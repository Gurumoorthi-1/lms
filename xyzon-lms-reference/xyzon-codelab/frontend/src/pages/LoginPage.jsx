import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../components/Toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      showToast('Welcome back!', 'success')
      navigate('/codelab')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fff7ed 0%, #f8fafc 50%, #eff6ff 100%)',
      padding: 24
    }}>
      <div className="fade-in" style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 420,
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:48, height:48, background:'var(--navy)', borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:18, color:'white', margin:'0 auto 14px'
          }}>X</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:6 }}>Welcome back</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>Sign in to your XyzonLMS account</p>
        </div>

        {/* Demo credentials */}
        <div style={{
          background:'var(--orange-bg)', border:'1px solid var(--orange-border)',
          borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:12,
          color:'var(--orange-dark)'
        }}>
          💡 New here? <Link to="/register" style={{ color:'var(--orange)', fontWeight:700 }}>Create a free account</Link> to track your progress!
        </div>

        {error && (
          <div style={{
            background:'var(--red-bg)', border:'1px solid var(--red-border)',
            borderRadius:8, padding:'10px 14px', marginBottom:16,
            fontSize:13, color:'var(--red)', fontWeight:500
          }}>❌ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'block', marginBottom:6 }}>Email Address</label>
            <input
              type="email" required
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor='var(--orange)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'block', marginBottom:6 }}>Password</label>
            <input
              type="password" required
              placeholder="Your password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor='var(--orange)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            padding:'11px', borderRadius:8, background: loading ? 'var(--orange-light)' : 'var(--orange)',
            color:'white', fontWeight:700, fontSize:14,
            border:'none', cursor: loading ? 'not-allowed' : 'pointer',
            transition:'all 0.15s', marginTop:4,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8
          }}>
            {loading ? <><div className="spinner spinner-white"></div> Signing in...</> : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color:'var(--orange)', fontWeight:700 }}>Create one free</Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width:'100%', padding:'10px 12px',
  border:'1px solid var(--border)', borderRadius:8,
  fontSize:14, color:'var(--text)',
  outline:'none', transition:'border-color 0.15s',
  background:'white'
}
