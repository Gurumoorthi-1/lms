import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import CodeEditor from '../components/CodeEditor'
import { showToast } from '../components/Toast'

const LANG_COLORS = { javascript:'#eab308', python:'#2563eb', java:'#f97316' }
const LANG_LABELS = { javascript:'JS', python:'PY', java:'JAVA' }
const DIFF_COLORS = { Easy:'var(--green)', Medium:'var(--yellow)', Hard:'var(--red)' }
const DIFF_BG = { Easy:'var(--green-bg)', Medium:'var(--yellow-bg)', Hard:'var(--red-bg)' }

export default function ChallengesPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [challenges, setChallenges] = useState([])
  const [solved, setSolved] = useState([])
  const [selected, setSelected] = useState(null)
  const [code, setCode] = useState('')
  const [filter, setFilter] = useState('all')
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [output, setOutput] = useState(null)
  const [review, setReview] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [successModal, setSuccessModal] = useState(null)

  useEffect(() => {
    loadChallenges()
    if (user) loadProgress()
    // Toast listener
    const h = (e) => showToast(e.detail.message, e.detail.type)
    window.addEventListener('xl-toast', h)
    return () => window.removeEventListener('xl-toast', h)
  }, [user])

  async function loadChallenges() {
    try {
      const { data } = await axios.get('/api/challenges')
      setChallenges(data)
    } catch { showToast('Failed to load challenges', 'error') }
  }

  async function loadProgress() {
    try {
      const { data } = await axios.get('/api/progress/me')
      setSolved(data.solvedChallenges || [])
    } catch {}
  }

  function selectChallenge(c) {
    setSelected(c)
    setCode(c.starterCode)
    setOutput(null)
    setReview(null)
    setShowHint(false)
  }

  async function runChallenge() {
    if (!code.trim()) return showToast('Write some code!', 'error')
    setRunning(true)
    setOutput(null)
    try {
      const { data } = await axios.post('/api/run', { language: selected.language, code, input: '' })
      setOutput({ ...data, mode: 'run' })
    } catch { showToast('Server error. Is backend running?', 'error') }
    finally { setRunning(false) }
  }

  async function submitChallenge() {
    if (!code.trim()) return showToast('Write some code!', 'error')
    if (!user) return showToast('Please sign in to submit challenges!', 'error')
    setSubmitting(true)
    setOutput(null)
    try {
      const { data } = await axios.post('/api/progress/submit', { challengeId: selected.id, code })
      setOutput({ ...data, mode: 'submit' })

      if (data.isCorrect) {
        if (!solved.includes(selected.id)) {
          setSolved(prev => [...prev, selected.id])
          updateUser({ points: (user.points || 0) + (data.pointsEarned || 0) })
        }
        setSuccessModal({ challenge: selected, points: data.pointsEarned, total: data.totalSolved })
      } else {
        showToast('Wrong answer. Check your output!', 'error')
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Submission failed.', 'error')
    } finally { setSubmitting(false) }
  }

  async function getHint() {
    if (!code.trim()) return showToast('Write some code first!', 'error')
    setReviewing(true)
    setReview(null)
    try {
      const { data } = await axios.post('/api/review', { code, language: selected.language, challengeTitle: selected.title })
      setReview(data.review)
    } catch { setReview(`💡 Hint: ${selected.hint}`) }
    finally { setReviewing(false) }
  }

  function nextChallenge() {
    setSuccessModal(null)
    const idx = challenges.findIndex(c => c.id === selected.id)
    if (idx < challenges.length - 1) selectChallenge(challenges[idx + 1])
  }

  const filtered = challenges.filter(c => {
    if (filter === 'all') return true
    if (filter === 'solved') return solved.includes(c.id)
    if (filter === 'unsolved') return !solved.includes(c.id)
    return c.language === filter || c.difficulty === filter
  })

  const pct = challenges.length > 0 ? Math.round((solved.length / challenges.length) * 100) : 0

  return (
    <div className="fade-in" style={{ height:'calc(100vh - 60px)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header — matching screenshot style */}
      <div style={{
        background:'white', borderBottom:'1px solid var(--border)',
        padding:'14px 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexWrap:'wrap', gap:12, flexShrink:0
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:'var(--navy)' }}>🏆 Challenges</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              50 challenges • JavaScript, Python, Java • Auto-graded • Copy/paste restricted
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'var(--orange)', fontFamily:'var(--font-mono)', lineHeight:1 }}>{user?.points || 0}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Points</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'var(--navy)', fontFamily:'var(--font-mono)', lineHeight:1 }}>{solved.length}/50</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Solved</div>
          </div>
          <div style={{ width:1, height:36, background:'var(--border)' }}></div>
          <Link to="/codelab" style={{
            padding:'8px 20px', borderRadius:8, background:'#16a34a', color:'white',
            fontWeight:700, fontSize:13, border:'none', display:'flex', alignItems:'center', gap:7,
            textDecoration:'none', boxShadow:'0 2px 8px rgba(22,163,74,0.25)', transition:'background 0.15s'
          }}><span>✏️</span> Free</Link>
          <button style={{
            padding:'8px 20px', borderRadius:8, background:'var(--navy)', color:'white',
            fontWeight:700, fontSize:13, border:'none', cursor:'default',
            display:'flex', alignItems:'center', gap:7, boxShadow:'0 2px 8px rgba(30,42,74,0.18)'
          }}><span>🏆</span> Challenges</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background:'white', borderBottom:'1px solid var(--border)',
        padding:'8px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0
      }}>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, flexShrink:0 }}>Progress</span>
        <div style={{ flex:1, height:6, background:'var(--bg2)', borderRadius:3, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${pct}%`, borderRadius:3,
            background:'linear-gradient(90deg, var(--orange), var(--green))',
            transition:'width 0.5s ease'
          }}></div>
        </div>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, flexShrink:0 }}>{solved.length} / 50</span>
      </div>

      {/* Main layout */}
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', flex:1, overflow:'hidden' }}>

        {/* Challenge list */}
        <div style={{ background:'white', borderRight:'1px solid var(--border)', overflow:'auto', padding:12 }}>
          {/* Filters */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
            {[
              { val:'all', label:'All' },
              { val:'javascript', label:'JS' },
              { val:'python', label:'Python' },
              { val:'java', label:'Java' },
              { val:'Easy', label:'Easy' },
              { val:'Medium', label:'Medium' },
              { val:'Hard', label:'Hard' },
              { val:'solved', label:'✅ Solved' },
              { val:'unsolved', label:'🔲 Todo' },
            ].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)} style={{
                padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                border:`1px solid ${filter === f.val ? 'var(--orange)' : 'var(--border)'}`,
                background: filter === f.val ? 'var(--orange-bg)' : 'transparent',
                color: filter === f.val ? 'var(--orange-dark)' : 'var(--text-muted)',
                cursor:'pointer', transition:'all 0.15s'
              }}>{f.label}</button>
            ))}
          </div>

          {/* Challenge items */}
          {filtered.map(c => {
            const isSolved = solved.includes(c.id)
            const isActive = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => selectChallenge(c)} style={{
                padding:'10px 11px', borderRadius:8, marginBottom:4,
                border:`1px solid ${isActive ? 'var(--orange)' : isSolved ? 'var(--green-border)' : 'var(--border)'}`,
                background: isActive ? 'var(--orange-bg)' : isSolved ? 'var(--green-bg)' : 'white',
                cursor:'pointer', transition:'all 0.15s',
                display:'flex', alignItems:'flex-start', gap:9
              }}>
                <div style={{
                  width:20, height:20, borderRadius:'50%', flexShrink:0, marginTop:1,
                  border:`2px solid ${isSolved ? 'var(--green)' : 'var(--border)'}`,
                  background: isSolved ? 'var(--green)' : 'white',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, color:'white', fontWeight:700
                }}>{isSolved ? '✓' : ''}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {c.id}. {c.title}
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:`rgba(${LANG_COLORS[c.language] === '#eab308' ? '234,179,8' : c.language === 'python' ? '37,99,235' : '249,115,22'},.12)`, color:LANG_COLORS[c.language] }}>
                      {LANG_LABELS[c.language]}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, background:DIFF_BG[c.difficulty], color:DIFF_COLORS[c.difficulty] }}>
                      {c.difficulty}
                    </span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{c.category}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px 0', color:'var(--text-muted)', fontSize:13 }}>
              No challenges match the filter.
            </div>
          )}
        </div>

        {/* Challenge detail / editor */}
        {!selected ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'var(--text-muted)', background:'var(--bg)' }}>
            <span style={{ fontSize:48 }}>👈</span>
            <span style={{ fontSize:16, fontWeight:600 }}>Select a challenge to start</span>
            <span style={{ fontSize:13 }}>Choose from 50 challenges across JS, Python, and Java</span>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Challenge description */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'white', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontSize:17, fontWeight:800, color:'var(--navy)', marginBottom:6, display:'flex', alignItems:'center', gap:10 }}>
                    {selected.id}. {selected.title}
                    {solved.includes(selected.id) && <span style={{ fontSize:13, color:'var(--green)', fontWeight:700 }}>✅ Solved</span>}
                  </h2>
                  <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:`rgba(${selected.language === 'javascript' ? '234,179,8' : selected.language === 'python' ? '37,99,235' : '249,115,22'},.12)`, color:LANG_COLORS[selected.language] }}>
                      {LANG_LABELS[selected.language]}
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:DIFF_BG[selected.difficulty], color:DIFF_COLORS[selected.difficulty] }}>
                      {selected.difficulty}
                    </span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:'var(--bg2)', color:'var(--text-muted)', fontWeight:600 }}>
                      {selected.category}
                    </span>
                  </div>
                  <p style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.6 }}>{selected.description}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowHint(!showHint)} style={{
                  padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700,
                  border:'1px solid var(--orange-border)', background:'var(--orange-bg)',
                  color:'var(--orange-dark)', cursor:'pointer'
                }}>{showHint ? '🙈 Hide Hint' : '💡 Show Hint'}</button>
              </div>
              {showHint && (
                <div style={{
                  marginTop:10, padding:'10px 14px', borderLeft:'3px solid var(--orange)',
                  background:'var(--orange-bg)', borderRadius:'0 8px 8px 0',
                  fontSize:13, color:'var(--text-muted)', lineHeight:1.6
                }}>{selected.hint}</div>
              )}
            </div>

            {/* Editor toolbar */}
            <div style={{
              background:'white', borderBottom:'1px solid var(--border)',
              padding:'8px 14px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', flexShrink:0
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:LANG_COLORS[selected.language] }}></div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                  {{ javascript:'JavaScript', python:'Python', java:'Java' }[selected.language]}
                </span>
              </div>
              <span style={{
                fontSize:11, padding:'2px 9px', borderRadius:4, fontWeight:700,
                background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)'
              }}>🚫 Paste restricted</span>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <button onClick={getHint} disabled={reviewing} style={{
                  ...btnBase2, background:'var(--orange-bg)', color:'var(--orange-dark)', border:'1px solid var(--orange-border)'
                }}>
                  {reviewing ? <><div className="spinner"></div></> : '🤖 AI Hint'}
                </button>
                <button onClick={runChallenge} disabled={running} style={{ ...btnBase2, background:'var(--blue)', color:'white' }}>
                  {running ? <><div className="spinner spinner-white"></div> Running...</> : '▶ Run'}
                </button>
                <button onClick={submitChallenge} disabled={submitting} style={{ ...btnBase2, background:'var(--orange)', color:'white' }}>
                  {submitting ? <><div className="spinner spinner-white"></div> Checking...</> : '✔ Submit'}
                </button>
              </div>
            </div>

            {/* File bar */}
            <div style={{
              background:'#f8fafc', borderBottom:'1px solid var(--border)',
              padding:'5px 14px', display:'flex', alignItems:'center', gap:10,
              fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', flexShrink:0
            }}>
              <div style={{ display:'flex', gap:5 }}>
                {['#ef4444','#eab308','#22c55e'].map(c => (
                  <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }}></div>
                ))}
              </div>
              <span style={{ fontWeight:600, color:'var(--text)' }}>
                solution.{selected.language === 'javascript' ? 'js' : selected.language === 'python' ? 'py' : 'java'}
              </span>
              <span style={{ marginLeft:'auto', color:'var(--red)', background:'var(--red-bg)', border:'1px solid var(--red-border)', padding:'1px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>
                🚫 Paste not allowed
              </span>
            </div>

            {/* Editor */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0, background:'white' }}>
              <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:'200px' }}>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={selected.language}
                  blockPaste={true}
                />
              </div>

              {/* Output */}
              {output && (
                <div style={{ borderTop:'1px solid var(--border)', background:'white', flexShrink:0 }}>
                  <div style={{
                    padding:'6px 14px', borderBottom:'1px solid var(--border)',
                    display:'flex', alignItems:'center', gap:10
                  }}>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>
                      {output.mode === 'submit' ? 'Submission Result' : 'Output'}
                    </span>
                    {output.mode === 'submit' ? (
                      <span style={{
                        fontSize:11, padding:'2px 9px', borderRadius:4, fontWeight:700,
                        background: output.isCorrect ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: output.isCorrect ? 'var(--green)' : 'var(--red)',
                        border: `1px solid ${output.isCorrect ? 'var(--green-border)' : 'var(--red-border)'}`
                      }}>
                        {output.isCorrect ? '✅ Correct!' : '❌ Wrong Answer'}
                      </span>
                    ) : (
                      <span style={{
                        fontSize:11, padding:'2px 8px', borderRadius:4, fontWeight:700,
                        background: output.success ? 'var(--green-bg)' : 'var(--red-bg)',
                        color: output.success ? 'var(--green)' : 'var(--red)',
                        border: `1px solid ${output.success ? 'var(--green-border)' : 'var(--red-border)'}`
                      }}>
                        {output.success ? '✓ Ran' : '✗ Error'}
                      </span>
                    )}
                    <button onClick={() => setOutput(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)' }}>×</button>
                  </div>
                  <pre style={{
                    padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:12,
                    lineHeight:1.6, maxHeight:160, overflowY:'auto', margin:0,
                    color: (output.isCorrect || output.success) ? '#1e293b' : 'var(--red)',
                    whiteSpace:'pre-wrap', wordBreak:'break-all'
                  }}>
                    {output.output || output.error || '(no output)'}
                    {output.mode === 'submit' && !output.isCorrect && output.expectedOutput && (
                      <span style={{ color:'var(--text-muted)', display:'block', marginTop:8 }}>
                        {`\nExpected:\n${output.expectedOutput}`}
                      </span>
                    )}
                  </pre>
                </div>
              )}

              {/* AI Hint panel */}
              {review && (
                <div style={{ borderTop:'1px solid var(--border)', background:'#fffbf5', flexShrink:0 }}>
                  <div style={{ padding:'6px 14px', borderBottom:'1px solid var(--orange-border)', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--orange)' }}>🤖 AI Hint</span>
                    <button onClick={() => setReview(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)' }}>×</button>
                  </div>
                  <pre style={{ padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.7, maxHeight:160, overflowY:'auto', color:'var(--text)', whiteSpace:'pre-wrap', margin:0 }}>
                    {review}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {successModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:500
        }} onClick={() => setSuccessModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'white', borderRadius:20, padding:'36px 32px',
            maxWidth:400, width:'90%', textAlign:'center',
            boxShadow:'var(--shadow-lg)', animation:'modalIn 0.3s ease',
            border:'2px solid var(--green-border)'
          }}>
            <div style={{ fontSize:52, marginBottom:10 }}>🎉</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:'var(--green)', marginBottom:8 }}>Challenge Complete!</h2>
            <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:6, lineHeight:1.6 }}>
              You solved <strong style={{ color:'var(--navy)' }}>{successModal.challenge.title}</strong>!
            </p>
            {successModal.points > 0 && (
              <div style={{
                display:'inline-block', padding:'6px 16px', borderRadius:20,
                background:'var(--orange-bg)', border:'1px solid var(--orange-border)',
                color:'var(--orange-dark)', fontWeight:700, fontSize:14, marginBottom:16
              }}>+{successModal.points} points earned! 🌟</div>
            )}
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
              Total solved: {successModal.total} / 50
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={nextChallenge} style={{
                padding:'10px 20px', borderRadius:8, background:'var(--orange)',
                color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer'
              }}>Next Challenge →</button>
              <button onClick={() => setSuccessModal(null)} style={{
                padding:'10px 20px', borderRadius:8, border:'1px solid var(--border)',
                background:'white', fontWeight:700, fontSize:14, cursor:'pointer', color:'var(--text-muted)'
              }}>Stay Here</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn { from { transform: scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }
      `}</style>
    </div>
  )
}

const btnBase2 = { padding:'6px 13px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:5, border:'none' }
