# XyzonLMS CodeLab — MERN Stack
## Full Working Real-World Compiler + 50 Challenges

---

## 📁 Project Structure

```
xyzon-codelab/
├── backend/
│   ├── models/
│   │   ├── User.js          ← MongoDB user model
│   │   └── Progress.js      ← Challenge progress & submissions
│   ├── routes/
│   │   ├── auth.js          ← Register / Login / Me
│   │   ├── compiler.js      ← Real code execution (JS/Python/Java/C++)
│   │   ├── challenges.js    ← 50 challenge definitions + API
│   │   ├── progress.js      ← Submit, track, leaderboard
│   │   └── review.js        ← AI review (Ollama or static)
│   ├── middleware/
│   │   └── auth.js          ← JWT protect middleware
│   ├── server.js            ← Express entry point
│   ├── .env                 ← MongoDB Atlas URI + JWT secret
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx  ← Global auth state
│   │   ├── components/
│   │   │   ├── Navbar.jsx       ← Top navigation
│   │   │   ├── CodeEditor.jsx   ← Textarea editor with line numbers
│   │   │   └── Toast.jsx        ← Toast notifications
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── CodeLabPage.jsx  ← Free compiler
│   │   │   └── ChallengesPage.jsx ← 50 challenges
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── start.sh            ← One-click Linux/Mac start
├── start-windows.bat   ← One-click Windows start
└── README.md
```

---

## ✅ Prerequisites

Verify these are installed on your server:

```bash
node --version      # v16 or higher required
npm --version       # comes with Node.js
python3 --version   # Python 3.x for Python challenges
javac -version      # JDK (not just JRE!) for Java challenges
java -version       # Java runtime
g++ --version       # optional, for C++ support
```

### Install missing runtimes (Ubuntu/Debian):
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3
sudo apt install -y python3

# Java JDK (includes javac)
sudo apt install -y default-jdk

# G++ (C++)
sudo apt install -y g++
```

### Install missing runtimes (Windows):
- Node.js: https://nodejs.org
- Python: https://python.org
- Java JDK: https://adoptium.net
- G++: install MinGW or use WSL

---

## 🚀 Quick Start (3 steps)

### Step 1: Install dependencies
```bash
# Backend
cd xyzon-codelab/backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Start the backend
```bash
cd xyzon-codelab/backend
npm start
# Server starts at http://localhost:5000
# You should see: ✅ MongoDB Atlas connected
```

### Step 3: Start the frontend
```bash
# In a new terminal:
cd xyzon-codelab/frontend
npm run dev
# Frontend starts at http://localhost:5173
```

### Open in browser:
```
http://localhost:5173
```

---

## 🔑 MongoDB Atlas (Already configured)

Your `.env` file already has the MongoDB Atlas connection:
```
MONGO_URI=mongodb+srv://susmi170205_db_user:lms12345@...
```

The database `xyzon_lms` will be created automatically with two collections:
- `users` — registered users
- `progresses` — challenge submissions and solved status

---

## 🌐 Production Deployment

### Build the frontend:
```bash
cd frontend
npm run build
# Creates frontend/dist/ folder
```

### Serve frontend from backend:
Add to `backend/server.js` before the health check route:
```javascript
const path = require('path')
app.use(express.static(path.join(__dirname, '../frontend/dist')))
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  }
})
```

Then just run:
```bash
cd backend
node server.js
# Everything served from http://localhost:5000
```

### With PM2 (recommended):
```bash
npm install -g pm2
cd backend
pm2 start server.js --name "xyzon-codelab"
pm2 save
pm2 startup
```

### Nginx reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🤖 AI Review Feature (No API Key Required)

### Option 1: Ollama — Local LLM (Recommended, Free)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull llama3.2 model (~2GB, runs locally)
ollama pull llama3.2

# Ollama auto-starts on port 11434
# The backend detects it automatically
```

### Option 2: Static Analysis (Auto-fallback)
If Ollama is not installed, the server uses built-in static analysis that checks:
- Variable naming & style (var vs let/const in JS)
- Indentation & PEP 8 compliance (Python)
- Method structure & comments (Java)
- Code complexity and line count

---

## 🏆 Challenge System

| Range | Language | Easy | Medium | Hard |
|-------|----------|------|--------|------|
| #1–20 | JavaScript | 9 | 6 | 5 |
| #21–37 | Python | 6 | 6 | 5 |
| #38–50 | Java | 7 | 3 | 3 |

**Points per challenge:**
- Easy: 10 points
- Medium: 20 points
- Hard: 30 points

**Features:**
- ✅ Real code execution via subprocess (node / python3 / javac+java)
- ✅ Auto-grading — output compared to expected
- ✅ Progress saved to MongoDB Atlas
- ✅ Copy/paste blocked in challenge mode
- ✅ AI hints via Ollama or static fallback
- ✅ Success modal with points earned
- ✅ Per-user leaderboard endpoint

---

## 🔒 Security

- JWT authentication (30-day tokens)
- bcrypt password hashing (12 rounds)
- 10-second code execution timeout
- SIGKILL for timeout enforcement
- Code runs in isolated tmp directory
- Temporary files cleaned up after each run

---

## 🛠 Troubleshooting

**MongoDB connection fails:**
```bash
# Check if MONGO_URI in .env is correct
# Try pinging Atlas from terminal:
node -e "require('mongoose').connect(process.env.MONGO_URI).then(()=>console.log('OK')).catch(e=>console.error(e))"
```

**Java compilation fails:**
```bash
# Verify javac is available (not just java)
which javac
javac -version
# If missing: sudo apt install default-jdk
```

**Port already in use:**
```bash
# Kill process on port 5000
fuser -k 5000/tcp
# Or change PORT in backend/.env
```

**Frontend can't reach backend:**
- Make sure backend is running on port 5000
- Check vite.config.js proxy setting points to http://localhost:5000
- CORS is configured in backend/server.js

**C++ not working:**
```bash
which g++
g++ --version
sudo apt install g++
```
