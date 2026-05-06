import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import CodeEditor from '../components/CodeEditor'
import { showToast } from '../components/Toast'

const LANGS = [
  { id:'javascript', label:'JavaScript', dot:'#eab308', file:'playground.js' },
  { id:'python',     label:'Python',     dot:'#2563eb', file:'playground.py' },
  { id:'java',       label:'Java',       dot:'#f97316', file:'playground.java' },
  { id:'cpp',        label:'C++',        dot:'#8b5cf6', file:'playground.cpp' },
]

const DEFAULTS = {
  javascript: `// JavaScript Free Compiler\nconsole.log("Hello from XyzonLMS!");\n\nconst nums = [1, 2, 3, 4, 5];\nconst sum = nums.reduce((a, b) => a + b, 0);\nconsole.log("Sum:", sum);\nconsole.log("Squares:", nums.map(x => x * x));`,
  python: `# Python Free Compiler\nprint("Hello from XyzonLMS!")\n\nnums = [1, 2, 3, 4, 5]\nprint("Sum:", sum(nums))\nprint("Squares:", [x**2 for x in nums])`,
  java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter a number: ");\n        int num = sc.nextInt();\n        System.out.println("You entered: " + num);\n    }\n}`,
  cpp: `#include <iostream>\n#include <vector>\n#include <numeric>\nusing namespace std;\n\nint main() {\n    cout << "Hello from XyzonLMS!" << endl;\n    vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = accumulate(nums.begin(), nums.end(), 0);\n    cout << "Sum: " << sum << endl;\n    return 0;\n}`,
}

export default function CodeLabPage() {
  const { user } = useAuth()
  const [lang, setLang] = useState('java')
  const [codes, setCodes] = useState({ ...DEFAULTS })
  const [stdin, setStdin] = useState('')
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState(null)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (user) fetchProgress()
    const handler = (e) => showToast(e.detail.message, e.detail.type)
    window.addEventListener('xl-toast', handler)
    return () => window.removeEventListener('xl-toast', handler)
  }, [user])

  async function fetchProgress() {
    try {
      const { data } = await axios.get('/api/progress/me')
      setProgress(data)
    } catch (e) {}
  }

  async function runCode() {
    const code = codes[lang].trim()
    if (!code) return showToast('Write some code first!', 'error')
    setRunning(true)
    setOutput(null)
    setReview(null)
    try {
      const { data } = await axios.post('/api/run', { language: lang, code, input: stdin })
      setOutput(data)
      if (data.success) showToast('Code ran successfully!', 'success')
    } catch (err) {
      showToast(err.response?.data?.error || 'Server error. Is the backend running?', 'error')
    } finally {
      setRunning(false)
    }
  }

  async function getReview() {
    const code = codes[lang].trim()
    if (!code) return showToast('Write some code first!', 'error')
    setReviewing(true)
    setReview(null)
    try {
      const { data } = await axios.post('/api/review', { code, language: lang })
      setReview(data.review)
    } catch {
      setReview('Server offline. Could not get review.')
    } finally {
      setReviewing(false)
    }
  }

  const currentLang = LANGS.find(l => l.id === lang)
  const solvedCount = progress?.solvedChallenges?.length || 0
  const points = user?.points || 0

  return (
    <div className="fade-in" style={{ height:'calc(100vh - 60px)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header bar matching the screenshot exactly ── */}
      <div style={{
        background:'white', borderBottom:'1px solid var(--border)',
        padding:'14px 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexWrap:'wrap', gap:12, flexShrink:0
      }}>
        {/* Left: title + subtitle + free-mode badge */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:'var(--navy)', display:'flex', alignItems:'center', gap:8 }}>
              💻 Code Lab
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              JS • Python • Java • C++ — all run natively on the server
            </div>
          </div>
          <span style={{
            background:'var(--green-bg)', color:'var(--green)',
            border:'1px solid var(--green-border)',
            borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700,
            whiteSpace:'nowrap'
          }}>✅ Free Mode — copy/paste ON</span>
        </div>

        {/* Right: Points + Solved + FREE button (green) + Challenges button (navy) */}
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {/* Points */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'var(--orange)', fontFamily:'var(--font-mono)', lineHeight:1 }}>
              {points}
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Points</div>
          </div>

          {/* Solved */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:22, color:'var(--navy)', fontFamily:'var(--font-mono)', lineHeight:1 }}>
              {solvedCount}/50
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Solved</div>
          </div>

          <div style={{ width:1, height:36, background:'var(--border)' }}></div>

          {/* ✏️ Free button — green, active state */}
          <button style={{
            padding:'8px 20px', borderRadius:8,
            background:'#16a34a', color:'white',
            fontWeight:700, fontSize:13, border:'none', cursor:'default',
            display:'flex', alignItems:'center', gap:7,
            boxShadow:'0 2px 8px rgba(22,163,74,0.25)'
          }}>
            <span>✏️</span> Free
          </button>

          {/* 🏆 Challenges button — navy */}
          <Link to="/challenges" style={{
            padding:'8px 20px', borderRadius:8,
            background:'var(--navy)', color:'white',
            fontWeight:700, fontSize:13, border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:7,
            textDecoration:'none',
            boxShadow:'0 2px 8px rgba(30,42,74,0.18)',
            transition:'background 0.15s'
          }}>
            <span>🏆</span> Challenges
          </Link>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', flex:1, overflow:'hidden' }}>

        {/* Left info panel */}
        <div style={{
          background:'white', borderRight:'1px solid var(--border)',
          overflow:'auto', padding:16, display:'flex', flexDirection:'column', gap:14
        }}>
          <div>
            <div style={sectionTitle}>✏️ Free Compiler</div>
            <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6, marginBottom:12 }}>
              Your personal sandbox. Paste, experiment, and run any code!
            </p>
            {[
              { icon:'✅', title:'Copy/paste fully enabled', desc:'Paste code from anywhere' },
              { icon:'🚀', title:'All 4 languages work', desc:'JS, Python, Java, C++ run natively' },
              { icon:'⚡', title:'No API keys needed', desc:'Code runs directly on the server' },
            ].map(f => (
              <div key={f.title} style={featureCard}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{f.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Runtimes */}
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
            <div style={sectionTitle}>Available Runtimes</div>
            {[
              { name:'JavaScript', ver:'Runs instantly', dot:'#eab308' },
              { name:'Python',     ver:'Python 3.10.2', dot:'#2563eb' },
              { name:'Java',       ver:'JDK 21',        dot:'#f97316' },
              { name:'C++',        ver:'GCC 13',        dot:'#8b5cf6' },
            ].map(r => (
              <div key={r.name} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, fontWeight:600, color:'var(--text)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:r.dot, flexShrink:0 }}></div>
                  {r.name}
                </div>
                <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:11 }}>{r.ver}</span>
              </div>
            ))}
          </div>

          {/* stdin */}
          <div>
            <div style={sectionTitle}>stdin Input (optional)</div>
            <textarea
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="Enter program input here..."
              style={{
                width:'100%', padding:'8px 10px', minHeight:64, resize:'vertical',
                border:'1px solid var(--border)', borderRadius:8,
                fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text)',
                background:'var(--bg)', outline:'none'
              }}
            />
          </div>
        </div>

        {/* ── Editor area ── */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Toolbar: lang tabs + Run / Submit / Review */}
          <div style={{
            background:'white', borderBottom:'1px solid var(--border)',
            padding:'8px 14px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', flexShrink:0
          }}>
            {/* Language tabs */}
            {LANGS.map(l => (
              <button key={l.id} onClick={() => setLang(l.id)} style={{
                padding:'6px 14px', borderRadius:8,
                border: lang === l.id ? '2px solid var(--navy)' : '1px solid var(--border)',
                background: lang === l.id ? 'var(--navy)' : 'white',
                color: lang === l.id ? 'white' : 'var(--text-muted)',
                fontWeight:700, fontSize:13, cursor:'pointer',
                display:'flex', alignItems:'center', gap:6, transition:'all 0.15s'
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: lang === l.id ? 'white' : l.dot }}></div>
                {l.label}
              </button>
            ))}

            {/* Action buttons — matching screenshot: Run (green), Submit (orange), Review (navy) */}
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button onClick={runCode} disabled={running} style={{
                padding:'7px 18px', borderRadius:8, background:'#16a34a', color:'white',
                fontWeight:700, fontSize:13, border:'none', cursor: running ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:6, opacity: running ? 0.7 : 1,
                boxShadow:'0 1px 4px rgba(22,163,74,0.3)', transition:'all 0.15s'
              }}>
                {running
                  ? <><div className="spinner spinner-white"></div> Running...</>
                  : <><span style={{fontSize:15}}>▶</span> Run</>}
              </button>

              <button onClick={() => showToast('Submit is for Challenges mode. Use Run to test here!', 'info')} style={{
                padding:'7px 18px', borderRadius:8, background:'var(--orange)', color:'white',
                fontWeight:700, fontSize:13, border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6,
                boxShadow:'0 1px 4px rgba(249,115,22,0.3)', transition:'all 0.15s'
              }}>
                <span style={{fontSize:14}}>📤</span> Submit
              </button>

              <button onClick={getReview} disabled={reviewing} style={{
                padding:'7px 18px', borderRadius:8, background:'var(--navy)', color:'white',
                fontWeight:700, fontSize:13, border:'none', cursor: reviewing ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', gap:6, opacity: reviewing ? 0.7 : 1,
                boxShadow:'0 1px 4px rgba(30,42,74,0.2)', transition:'all 0.15s'
              }}>
                {reviewing
                  ? <><div className="spinner spinner-white"></div> Analyzing...</>
                  : <><span style={{fontSize:14}}>🤖</span> Review</>}
              </button>
            </div>
          </div>

          {/* File bar */}
          <div style={{
            background:'#1e2a4a', borderBottom:'1px solid #2d3d6b',
            padding:'6px 16px', display:'flex', alignItems:'center', gap:10,
            fontFamily:'var(--font-mono)', fontSize:12, color:'#94a3b8', flexShrink:0
          }}>
            <div style={{ display:'flex', gap:6 }}>
              {['#ef4444','#eab308','#22c55e'].map(c => (
                <div key={c} style={{ width:11, height:11, borderRadius:'50%', background:c }}></div>
              ))}
            </div>
            <span style={{ color:'#cbd5e1', fontWeight:500 }}>{currentLang?.file}</span>
            <span style={{
              marginLeft:'auto', color:'var(--green)', background:'rgba(34,197,94,0.12)',
              border:'1px solid rgba(34,197,94,0.3)', padding:'1px 9px',
              borderRadius:4, fontSize:11, fontWeight:700
            }}>✅ Paste allowed</span>
          </div>

          {/* Code editor — dark bg matching screenshot */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div style={{ flex:1, overflow:'hidden', display:'flex', background:'#1e2a4a' }}>
              <DarkCodeEditor
                value={codes[lang]}
                onChange={v => setCodes(p => ({ ...p, [lang]: v }))}
                language={lang}
                blockPaste={false}
              />
            </div>

            {/* Output */}
            {output !== null && (
              <div style={{ borderTop:'1px solid var(--border)', background:'white', flexShrink:0 }}>
                <div style={{
                  padding:'6px 16px', borderBottom:'1px solid var(--border)',
                  display:'flex', alignItems:'center', gap:10
                }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Output</span>
                  <span style={{
                    fontSize:11, padding:'2px 9px', borderRadius:4, fontFamily:'var(--font-mono)', fontWeight:700,
                    background: output.success ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: output.success ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${output.success ? 'var(--green-border)' : 'var(--red-border)'}`
                  }}>
                    {output.success ? '✓ Success' : '✗ Error'}{output.execTime ? ` • ${output.execTime}ms` : ''}
                  </span>
                  <button onClick={() => setOutput(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
                </div>
                <pre style={{
                  padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:13,
                  lineHeight:1.65, maxHeight:200, overflowY:'auto',
                  color: output.success ? '#1e293b' : 'var(--red)',
                  whiteSpace:'pre-wrap', wordBreak:'break-all', margin:0
                }}>
                  {output.output || output.error || '(no output)'}
                  {output.output && output.error && (
                    <span style={{ color:'var(--yellow)' }}>{'\n[stderr]: ' + output.error}</span>
                  )}
                </pre>
              </div>
            )}

            {/* AI Review */}
            {review && (
              <div style={{ borderTop:'1px solid var(--border)', background:'#fffbf5', flexShrink:0 }}>
                <div style={{
                  padding:'6px 16px', borderBottom:'1px solid var(--orange-border)',
                  display:'flex', alignItems:'center', gap:8
                }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--orange)' }}>🤖 AI Code Review</span>
                  <button onClick={() => setReview(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>×</button>
                </div>
                <pre style={{
                  padding:'12px 16px', fontFamily:'var(--font-mono)', fontSize:12,
                  lineHeight:1.7, maxHeight:180, overflowY:'auto',
                  color:'var(--text)', whiteSpace:'pre-wrap', margin:0
                }}>{review}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .app-shell { display:flex; flex-direction:column; min-height:100vh; }
        .app-main { flex:1; display:flex; flex-direction:column; }
        .loading-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); }
      `}</style>
    </div>
  )
}

// Dark-themed editor matching the screenshot's dark code area
function DarkCodeEditor({ value, onChange, language, blockPaste }) {
  const lines = value.split('\n')

  function handleKeyDown(e) {
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd
    if (e.key === 'Tab') {
      e.preventDefault()
      const spaces = '  '
      onChange(value.substring(0, start) + spaces + value.substring(end))
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.substring(lineStart, start)
      const indent = currentLine.match(/^(\s*)/)[1]
      const extra = ['{','(','[',':'].includes(value[start-1]) ? '  ' : ''
      e.preventDefault()
      onChange(value.substring(0, start) + '\n' + indent + extra + value.substring(end))
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extra.length }, 0)
    }
  }

  function handlePaste(e) {
    if (blockPaste) {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('xl-toast', { detail: { message: '🚫 Copy/paste is disabled in Challenge mode!', type: 'error' } }))
    }
  }

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden', background:'#1a2035' }}>
      {/* Line numbers */}
      <div style={{
        background:'#151d30', padding:'14px 10px',
        fontFamily:'var(--font-mono)', fontSize:13, lineHeight:'1.65',
        color:'#4a5a7a', userSelect:'none', overflowY:'hidden',
        minWidth:46, textAlign:'right', flexShrink:0,
        borderRight:'1px solid #2d3d6b'
      }}>
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      {/* Textarea */}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onContextMenu={blockPaste ? e => e.preventDefault() : undefined}
        spellCheck={false}
        autoComplete="off" autoCorrect="off" autoCapitalize="off"
        style={{
          flex:1, background:'#1a2035', color:'#e2e8f0',
          fontFamily:'var(--font-mono)', fontSize:13, lineHeight:'1.65',
          padding:'14px 16px', border:'none', outline:'none', resize:'none',
          overflowY:'auto', whiteSpace:'pre', overflowWrap:'normal', overflowX:'auto',
          caretColor:'#f97316', tabSize:2,
        }}
      />
    </div>
  )
}

const sectionTitle = { fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-muted)', marginBottom:8 }
const featureCard = { display:'flex', alignItems:'flex-start', gap:8, padding:'9px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, marginBottom:6 }
