import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../components/Toast'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      showToast('Account created! Welcome to XyzonLMS 🎉', 'success')
      navigate('/codelab')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'calc(100vh - 60px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #fff7ed 0%, #f8fafc 50%, #eff6ff 100%)',
      padding:24
    }}>
      <div className="fade-in" style={{
        background:'white', border:'1px solid var(--border)',
        borderRadius:16, padding:'40px 36px',
        width:'100%', maxWidth:420, boxShadow:'var(--shadow-lg)'
      }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:48, height:48, background:'var(--orange)', borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:18, color:'white', margin:'0 auto 14px'
          }}>✨</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--navy)', marginBottom:6 }}>Create your account</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>Start coding with XyzonLMS today — it's free</p>
        </div>

        {error && (
          <div style={{
            background:'var(--red-bg)', border:'1px solid var(--red-border)',
            borderRadius:8, padding:'10px 14px', marginBottom:16,
            fontSize:13, color:'var(--red)', fontWeight:500
          }}>❌ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { label:'Full Name', key:'name', type:'text', placeholder:'Susmitha' },
            { label:'Email Address', key:'email', type:'email', placeholder:'you@example.com' },
            { label:'Password', key:'password', type:'password', placeholder:'Min. 6 characters' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'block', marginBottom:6 }}>{label}</label>
              <input
                type={type} required placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor='var(--orange)'}
                onBlur={e => e.target.style.borderColor='var(--border)'}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} style={{
            padding:'11px', borderRadius:8,
            background: loading ? 'var(--orange-light)' : 'var(--orange)',
            color:'white', fontWeight:700, fontSize:14, border:'none',
            cursor: loading ? 'not-allowed' : 'pointer', marginTop:4,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8
          }}>
            {loading ? <><div className="spinner spinner-white"></div> Creating account...</> : 'Create Free Account →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--orange)', fontWeight:700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width:'100%', padding:'10px 12px',
  border:'1px solid var(--border)', borderRadius:8,
  fontSize:14, color:'var(--text)', outline:'none',
  transition:'border-color 0.15s', background:'white'
}
