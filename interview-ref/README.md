# 🤖 AI Interview Preparation System

A full-stack MERN application featuring a 3-round AI-powered interview simulation with real-time proctoring, adaptive questions, Monaco code editor, voice-based HR interview, and comprehensive performance analytics.

---

## 🎯 Features

| Feature | Details |
|---|---|
| **Resume Analysis** | AI parses PDF/DOCX, generates ATS score, skill extraction, suggestions |
| **Aptitude Test** | 5–50 questions (70% general + 30% resume-based), timer, hints, auto-submit |
| **Coding Round** | LeetCode-style Monaco editor, 5 AI problems (1E/2M/2H), run & submit |
| **HR Interview** | Voice Q&A (TTS + STT), AI follow-ups, response scoring |
| **AI Proctoring** | Camera + mic monitoring, tab-switch detection, noise detection, fullscreen enforcement |
| **Analytics** | Radar/bar charts, round scores, AI feedback report, strengths/weaknesses |

---

## 🗂 Project Structure

```
ai-interview-system/
├── backend/
│   ├── controllers/
│   │   ├── resumeController.js      # Resume upload + AI analysis
│   │   ├── aptitudeController.js    # Question generation + scoring
│   │   ├── codingController.js      # Problem generation + code eval
│   │   ├── interviewController.js   # HR questions + response analysis
│   │   ├── analyticsController.js   # Final results + AI feedback
│   │   └── sessionController.js     # Session management
│   ├── models/
│   │   └── Session.js               # MongoDB session schema
│   ├── routes/                      # Express route definitions
│   ├── utils/
│   │   └── claudeAI.js              # Anthropic Claude API wrapper
│   ├── uploads/                     # Temp file storage (auto-created)
│   ├── server.js                    # Express entry point
│   ├── .env.example                 # Environment variable template
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.js          # Landing + feature showcase
│   │   │   ├── ResumePage.js        # Upload + AI analysis UI
│   │   │   ├── AptitudePage.js      # Quiz with proctoring
│   │   │   ├── CodingPage.js        # Monaco editor coding round
│   │   │   ├── InterviewPage.js     # Voice HR interview
│   │   │   └── ResultsPage.js       # Analytics dashboard
│   │   ├── components/
│   │   │   ├── proctoring/
│   │   │   │   └── ProctoringPanel.js
│   │   │   └── shared/
│   │   │       ├── Navbar.js
│   │   │       ├── Timer.js
│   │   │       └── LoadingScreen.js
│   │   ├── context/
│   │   │   └── SessionContext.js    # Global state
│   │   ├── hooks/
│   │   │   ├── useProctoring.js     # Camera/mic/tab detection
│   │   │   └── useSpeech.js         # TTS + STT
│   │   ├── utils/
│   │   │   └── api.js               # Axios API client
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.js
│   │   └── index.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MongoDB** (local or MongoDB Atlas)
- **Anthropic API Key** ([get one here](https://console.anthropic.com/))

---

## 🚀 Quick Setup

### 1. Clone / Extract the project

```bash
cd ai-interview-system
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-interview-system
ANTHROPIC_API_KEY=sk-ant-your-key-here
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy env (optional – defaults to localhost:5000)
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm start
```

### 4. Open in Browser

```
http://localhost:3000
```

---

## 🐳 Docker Setup (Optional)

```bash
# From project root
docker-compose up --build
```

---

## 🔑 API Keys

### Anthropic Claude API
1. Go to https://console.anthropic.com/
2. Create an account and generate an API key
3. Add to `backend/.env` as `ANTHROPIC_API_KEY`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/resume/upload` | Upload + analyze resume |
| GET | `/api/resume/:sessionId` | Get resume analysis |
| POST | `/api/aptitude/generate` | Generate aptitude questions |
| POST | `/api/aptitude/submit` | Submit test answers |
| POST | `/api/coding/generate` | Generate coding problems |
| POST | `/api/coding/run` | Run code against test cases |
| POST | `/api/coding/submit` | Submit code solution |
| POST | `/api/coding/complete` | Complete coding round |
| POST | `/api/interview/generate-questions` | Generate HR questions |
| POST | `/api/interview/analyze-response` | Analyze spoken answer |
| POST | `/api/interview/complete` | Complete interview |
| GET | `/api/analytics/:sessionId` | Get final analytics |
| POST | `/api/analytics/proctoring-event` | Log proctoring event |
| GET | `/api/session/:sessionId` | Get session data |
| GET | `/api/health` | Health check |

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Blue | `#0a0a5c` |
| Accent Orange | `#ff5722` |
| Background | `#f8f9fa` |
| Success | `#10b981` |
| Font Display | Syne (headings) |
| Font Body | DM Sans |

---

## 🎥 Proctoring Features

- **Camera Feed** — live feed displayed in sidebar
- **Microphone** — continuous noise level monitoring
- **Tab Switch** — detects and logs every tab change
- **Fullscreen** — enforced, exit triggers warning
- **Head Movement** — pixel-diff based detection
- **Keyboard Shortcuts** — Ctrl+C/V/T/W blocked
- **Right Click** — disabled during test
- **All Events** — logged to MongoDB with timestamp

---

## 🔧 Troubleshooting

**Camera not working?**
- Ensure browser has camera/mic permissions
- Use HTTPS in production (required for getUserMedia)
- Chrome/Firefox recommended

**MongoDB connection error?**
- Install MongoDB locally: https://www.mongodb.com/try/download/community
- Or use MongoDB Atlas (free tier)
- App works without MongoDB using in-memory fallback

**AI responses failing?**
- Verify `ANTHROPIC_API_KEY` in `.env`
- Check API key has credits
- Fallback mock data is used if AI fails

**Monaco Editor not loading?**
- Clear npm cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules && npm install`

---

## 📊 Scoring System

| Round | Pass Criteria | Max Score |
|---|---|---|
| Aptitude | 50% (hint = -0.5 marks) | Configurable |
| Coding | 3 out of 5 problems | 5 problems |
| Interview | 5/10 average score | 10 per question |

---

## 🛡️ Security Notes

- No authentication required (direct access)
- Session IDs are UUIDs (unguessable)
- File uploads validated by extension + size
- Uploaded resumes deleted after parsing
- API keys stored in server-side `.env` only

---

## 📝 License

MIT License — free to use and modify.
