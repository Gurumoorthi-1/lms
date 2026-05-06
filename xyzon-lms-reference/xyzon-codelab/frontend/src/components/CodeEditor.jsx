import React, { useRef, useEffect } from 'react'

export default function CodeEditor({ value, onChange, language, readOnly = false, blockPaste = false }) {
  const textareaRef = useRef(null)
  const lineNumRef = useRef(null)

  // Sync scroll between line numbers and textarea
  useEffect(() => {
    const ta = textareaRef.current
    const ln = lineNumRef.current
    if (!ta || !ln) return
    const syncScroll = () => { ln.scrollTop = ta.scrollTop }
    ta.addEventListener('scroll', syncScroll)
    return () => ta.removeEventListener('scroll', syncScroll)
  }, [])

  const lines = value.split('\n')

  function handleKeyDown(e) {
    const ta = e.target
    const start = ta.selectionStart
    const end = ta.selectionEnd

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault()
      const spaces = '  '
      const newVal = value.substring(0, start) + spaces + value.substring(end)
      onChange(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + spaces.length }, 0)
    }

    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" }
    if (pairs[e.key] && start === end) {
      e.preventDefault()
      const closing = pairs[e.key]
      const newVal = value.substring(0, start) + e.key + closing + value.substring(end)
      onChange(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 }, 0)
    }

    // Enter with auto-indent
    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.substring(lineStart, start)
      const indent = currentLine.match(/^(\s*)/)[1]
      const lastChar = value[start - 1]
      const extraIndent = ['{', '(', '[', ':'].includes(lastChar) ? '  ' : ''
      e.preventDefault()
      const newVal = value.substring(0, start) + '\n' + indent + extraIndent + value.substring(end)
      onChange(newVal)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extraIndent.length }, 0)
    }
  }

  function handlePaste(e) {
    if (blockPaste) {
      e.preventDefault()
      // Import showToast dynamically to avoid circular deps
      import('../components/Toast.jsx').then(m => {
        // call via window event
      })
      window.dispatchEvent(new CustomEvent('xl-toast', { detail: { message: '🚫 Copy/paste is disabled in Challenge mode!', type: 'error' } }))
      return false
    }
  }

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>
      {/* Line numbers */}
      <div ref={lineNumRef} style={{
        background: '#f1f5f9',
        borderRight: '1px solid var(--border)',
        padding: '14px 10px 14px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: '1.65',
        color: '#94a3b8',
        userSelect: 'none',
        overflowY: 'hidden',
        minWidth: 44,
        textAlign: 'right',
        flexShrink: 0
      }}>
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onContextMenu={blockPaste ? e => e.preventDefault() : undefined}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          flex: 1,
          background: '#ffffff',
          color: '#1e293b',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: '1.65',
          padding: '14px 16px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflowY: 'auto',
          whiteSpace: 'pre',
          overflowWrap: 'normal',
          overflowX: 'auto',
          caretColor: 'var(--orange)',
          tabSize: 2,
        }}
      />
    </div>
  )
}
