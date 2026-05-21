"use client";

import React, { useEffect } from 'react';

const TEST_MODE = false; // Proctoring active and copy/paste completely blocked

export default function CodeEditor({ value, onChange, language, blockPaste = false }) {
  const lines = value.split('\n');

  function handleKeyDown(e) {
    const ta = e.target;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // Completely block copy, paste, and cut inside CodeEditor (Ctrl+C, Ctrl+V, Ctrl+X)
    const isClipboardAction = (e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase());
    if (isClipboardAction) {
      e.preventDefault();
      alert('🚫 Copying, pasting, and cutting is strictly prohibited during the exam!');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const spaces = '  ';
      onChange(value.substring(0, start) + spaces + value.substring(end));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      const extra = ['{','(','[',':'].includes(value[start-1]) ? '  ' : '';
      e.preventDefault();
      onChange(value.substring(0, start) + '\n' + indent + extra + value.substring(end));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extra.length; }, 0);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    alert('🚫 Copying/pasting is strictly prohibited during the exam!');
  }

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden', background:'#1a2035', height:'100%' }}>
      {/* Line numbers */}
      <div style={{
        background:'#151d30', padding:'14px 10px',
        fontFamily:'monospace', fontSize:13, lineHeight:'1.65',
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
        onContextMenu={e => e.preventDefault()}
        spellCheck={false}
        autoComplete="off" autoCorrect="off" autoCapitalize="off"
        style={{
          flex:1, background:'#1a2035', color:'#e2e8f0',
          fontFamily:'monospace', fontSize:13, lineHeight:'1.65',
          padding:'14px 16px', border:'none', outline:'none', resize:'none',
          overflowY:'auto', overflowX:'hidden', whiteSpace:'pre-wrap', overflowWrap:'anywhere',
          caretColor:'#f97316', tabSize:2, width:'100%', boxSizing:'border-box',
        }}
      />
    </div>
  );
}
