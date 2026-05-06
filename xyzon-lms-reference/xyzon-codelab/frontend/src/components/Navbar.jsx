import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
    setShowMenu(false)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      {/* Brand */}
      <Link to="/codelab" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <div style={{
          width: 34, height: 34, background: 'var(--navy)',
          borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight: 800, fontSize: 13, color: 'white', fontFamily: 'var(--font-ui)',
          letterSpacing: '-0.5px'
        }}>X</div>
        <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--navy)', letterSpacing:'-0.3px' }}>
          Xyzon<span style={{ color: 'var(--orange)' }}>LMS</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display:'flex', alignItems:'center', gap:2 }}>
        {[
          { path:'/codelab', label:'💻 Code Lab' },
          { path:'/challenges', label:'🏆 Challenges' },
        ].map(({ path, label }) => (
          <Link key={path} to={path} style={{
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: isActive(path) ? 'white' : 'var(--text-muted)',
            background: isActive(path) ? 'var(--orange)' : 'transparent',
            transition: 'all 0.15s',
            textDecoration: 'none'
          }}>{label}</Link>
        ))}
      </div>

      {/* User area */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {user ? (
          <>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding: '5px 10px 5px 5px',
              borderRadius: 24,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              fontSize: 13
            }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background: 'var(--navy)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:12, color:'white'
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight:600, color:'var(--text)' }}>{user.name}</span>
              {user.points > 0 && (
                <span style={{
                  background:'var(--orange-bg)', color:'var(--orange)',
                  border:'1px solid var(--orange-border)',
                  borderRadius:12, padding:'1px 7px', fontSize:11, fontWeight:700
                }}>{user.points}pts</span>
              )}
            </div>
            <button onClick={handleLogout} style={{
              padding: '6px 14px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', fontSize:13, fontWeight:600, color:'var(--text-muted)',
              transition:'all 0.15s'
            }}
            onMouseOver={e => { e.target.style.borderColor='var(--red)'; e.target.style.color='var(--red)'; }}
            onMouseOut={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-muted)'; }}>
              Sign Out
            </button>
          </>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <Link to="/login" style={{
              padding:'6px 16px', borderRadius:8, border:'1px solid var(--border)',
              fontSize:13, fontWeight:600, color:'var(--text)', background:'transparent',
              transition:'all 0.15s'
            }}>Sign In</Link>
            <Link to="/register" style={{
              padding:'6px 16px', borderRadius:8,
              fontSize:13, fontWeight:600, color:'white', background:'var(--orange)',
              transition:'all 0.15s'
            }}>Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
