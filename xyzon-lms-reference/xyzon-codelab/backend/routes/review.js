const express = require('express');
const http = require('http');
const router = express.Router();

function tryOllama(code, language, title) {
  return new Promise((resolve) => {
    const prompt = `You are an expert coding mentor for a learning platform called XyzonLMS. Review this ${language} code for the challenge "${title || 'coding problem'}".

Give feedback on:
1. Correctness - is the logic right?
2. Code quality - style, naming, structure
3. Efficiency - time/space complexity
4. One improvement suggestion

Be encouraging and concise (4-6 sentences). Start with a positive observation.

Code:
\`\`\`${language}
${code}
\`\`\``;

    const body = JSON.stringify({ model: 'llama3.2', prompt, stream: false });
    const options = {
      hostname: 'localhost', port: 11434,
      path: '/api/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000
    };

    const req = http.request(options, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try { resolve({ ok: true, text: JSON.parse(data).response }); }
        catch { resolve({ ok: false }); }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
    req.write(body);
    req.end();
  });
}

function staticReview(code, language, title) {
  const lines = code.split('\n').filter(l => l.trim()).length;
  const issues = [], tips = [], praise = [];

  if (language === 'javascript') {
    if (!code.includes('var ')) praise.push('Great use of modern `let`/`const` declarations.');
    if (code.includes('var ')) issues.push('Consider replacing `var` with `let` or `const` (ES6+).');
    if (code.includes('===')) praise.push('Good use of strict equality `===`.');
    if (code.includes('==') && !code.includes('===')) issues.push('Use `===` for strict equality to avoid type coercion bugs.');
    if (code.includes('=>')) praise.push('Nice use of arrow functions for clean syntax.');
    if (code.match(/\.reduce\(|\.map\(|\.filter\(/)) praise.push('Excellent use of functional array methods.');
    if (!code.includes('//') && lines > 5) tips.push('Add comments to explain your logic for readability.');
  } else if (language === 'python') {
    if (!code.includes('\t')) praise.push('Good use of consistent space indentation (PEP 8).');
    if (code.includes('\t')) issues.push('Use 4 spaces instead of tabs for indentation (PEP 8 standard).');
    if (code.includes('def ')) praise.push('Good use of functions to organize logic.');
    if (!code.includes('#') && lines > 5) tips.push('Add docstrings or comments to explain your logic.');
    if (code.includes('[::-1]')) praise.push('Clean Pythonic use of slice notation for reversal.');
    if (code.includes('lambda')) praise.push('Nice use of lambda for concise functional code.');
  } else if (language === 'java') {
    if (code.includes('StringBuilder')) praise.push('Good use of StringBuilder for efficient string manipulation.');
    if (code.includes('ArrayList') || code.includes('HashMap')) praise.push('Solid use of Java Collections framework.');
    if (!code.includes('//') && lines > 8) tips.push('Add Javadoc comments for public methods.');
    if (code.includes('@Override')) praise.push('Correct use of @Override annotation.');
  }

  const difficulty = lines < 10 ? 'concise' : lines < 20 ? 'well-structured' : 'comprehensive';
  let review = `📊 Code Analysis — "${title || 'Solution'}"\n`;
  review += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (praise.length) review += `✅ Strengths:\n${praise.map(p => `  • ${p}`).join('\n')}\n\n`;
  if (issues.length) review += `⚠️  Improvements:\n${issues.map(i => `  • ${i}`).join('\n')}\n\n`;
  if (tips.length) review += `💡 Tips:\n${tips.map(t => `  • ${t}`).join('\n')}\n\n`;

  review += `📈 Overall: Your ${lines}-line solution is ${difficulty}. `;
  review += lines < 15
    ? 'Efficient and clean work! Keep it up.'
    : 'Shows good problem-solving depth. Consider refactoring long sections into helper functions.';
  review += '\n\n💡 Tip: Install Ollama with llama3.2 for AI-powered reviews!';

  return review;
}

// POST /api/review
router.post('/', async (req, res) => {
  const { code, language, challengeTitle } = req.body;
  if (!code) return res.status(400).json({ message: 'Code required' });

  const ollama = await tryOllama(code, language, challengeTitle);
  if (ollama.ok) {
    return res.json({ review: ollama.text, source: 'ollama' });
  }

  res.json({ review: staticReview(code, language, challengeTitle), source: 'static' });
});

module.exports = router;
