const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { protect } = require('../middleware/auth');
const Progress = require('../models/Progress');
const router = express.Router();

const TIMEOUT_MS = 10000;

// Auto-detect Python executable (handles Windows python, Linux python3, etc.)
function getPythonCmd() {
  const candidates = ['python3', 'python', 'python3.10', 'python3.11', 'python3.12'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { timeout: 3000, stdio: 'pipe' });
      return cmd;
    } catch (e) { continue; }
  }
  return 'python3';
}
const PYTHON_CMD = getPythonCmd();
console.log(`  🐍 Python runtime detected: ${PYTHON_CMD}`);

function runProcess(cmd, args, input, timeout) {
  return new Promise((resolve) => {
    let stdout = '', stderr = '', killed = false;

    const proc = spawn(cmd, args, { shell: false });
    const timer = setTimeout(() => {
      killed = true;
      try { proc.kill('SIGKILL'); } catch (e) {}
      resolve({ stdout, stderr: stderr + '\n⏱ Time limit exceeded (10 seconds)', code: 124 });
    }, timeout);

    if (input && input.trim()) {
      proc.stdin.write(input);
    }
    proc.stdin.end();

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', (code) => {
      if (!killed) {
        clearTimeout(timer);
        resolve({ stdout, stderr, code: code ?? 1 });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      let friendly = err.message;
      if (err.code === 'ENOENT') {
        const cmdMap = {
          python3: `Python not found. Try installing Python 3 or ensure "${cmd}" is in your PATH.`,
          python: `Python not found. Install Python from https://python.org`,
          javac: `javac not found. Install JDK (not just JRE): sudo apt install default-jdk`,
          java: `java not found. Install JDK: sudo apt install default-jdk`,
          'g++': `g++ not found. Install: sudo apt install g++`,
          node: `node not found. Install: https://nodejs.org`,
        };
        friendly = cmdMap[cmd] || `Command "${cmd}" not found in PATH.`;
      }
      resolve({ stdout: '', stderr: friendly, code: 1 });
    });
  });
}

async function executeCode(language, code, input) {
  const tmpDir = os.tmpdir();
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (language === 'javascript') {
    const file = path.join(tmpDir, `xl_${uid}.js`);
    fs.writeFileSync(file, code, 'utf8');
    const result = await runProcess('node', [file], input, TIMEOUT_MS);
    try { fs.unlinkSync(file); } catch (e) {}
    return result;
  }

  if (language === 'python') {
    const file = path.join(tmpDir, `xl_${uid}.py`);
    fs.writeFileSync(file, code, 'utf8');
    const result = await runProcess(PYTHON_CMD, [file], input, TIMEOUT_MS);
    try { fs.unlinkSync(file); } catch (e) {}
    return result;
  }

  if (language === 'java') {
    const classDir = path.join(tmpDir, `xl_java_${uid}`);
    fs.mkdirSync(classDir, { recursive: true });

    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Main';
    const srcFile = path.join(classDir, `${className}.java`);
    fs.writeFileSync(srcFile, code, 'utf8');

    const compile = await runProcess('javac', [srcFile], '', 15000);
    if (compile.code !== 0) {
      try { fs.rmSync(classDir, { recursive: true, force: true }); } catch (e) {}
      return { stdout: '', stderr: compile.stderr || compile.stdout, code: 1 };
    }

    const run = await runProcess('java', ['-cp', classDir, className], input, TIMEOUT_MS);
    try { fs.rmSync(classDir, { recursive: true, force: true }); } catch (e) {}
    return run;
  }

  if (language === 'cpp') {
    const srcFile = path.join(tmpDir, `xl_${uid}.cpp`);
    const binFile = path.join(tmpDir, `xl_${uid}.out`);
    fs.writeFileSync(srcFile, code, 'utf8');

    const compile = await runProcess('g++', ['-o', binFile, srcFile, '-std=c++17'], '', 15000);
    if (compile.code !== 0) {
      try { fs.unlinkSync(srcFile); } catch (e) {}
      return { stdout: '', stderr: compile.stderr, code: 1 };
    }

    const run = await runProcess(binFile, [], input, TIMEOUT_MS);
    try { fs.unlinkSync(srcFile); } catch (e) {}
    try { fs.unlinkSync(binFile); } catch (e) {}
    return run;
  }

  return { stdout: '', stderr: 'Unsupported language', code: 1 };
}

// POST /api/run
router.post('/', async (req, res) => {
  try {
    const { language, code, input = '' } = req.body;
    if (!language || !code?.trim()) {
      return res.status(400).json({ error: 'Language and code are required' });
    }

    const allowed = ['javascript', 'python', 'java', 'cpp'];
    if (!allowed.includes(language)) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    const startTime = Date.now();
    const result = await executeCode(language, code, input);
    const execTime = Date.now() - startTime;

    // Track usage if logged in (optional)
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await Progress.findOneAndUpdate(
          { user: decoded.id },
          { $inc: { freeRunCount: 1 }, lastActivity: Date.now() },
          { upsert: true }
        );
      } catch (e) { /* ignore auth errors in free mode */ }
    }

    res.json({
      success: result.code === 0,
      output: result.stdout || '',
      error: result.stderr || '',
      exitCode: result.code,
      execTime
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.executeCode = executeCode;
