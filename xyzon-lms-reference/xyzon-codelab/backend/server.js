const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/run', require('./routes/compiler'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/review', require('./routes/review'));

// Health check
app.get('/api/health', (req, res) => {
  const { execSync } = require('child_process');
  const chk = (cmd) => { try { return execSync(cmd, { timeout: 3000, encoding: 'utf8' }).trim().split('\n')[0]; } catch { return 'not found'; } };
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    runtimes: {
      node: chk('node --version'),
      python: chk('python3 --version'),
      java: chk('javac -version 2>&1 || echo "not found"'),
      cpp: chk('g++ --version | head -1')
    }
  });
});

// Connect MongoDB & start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('\n✅ MongoDB Atlas connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 XyzonLMS CodeLab API running on http://localhost:${PORT}`);
      console.log(`   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
