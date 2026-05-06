# AI-Powered HR Interview Simulator

A full-stack MERN web application with a premium SaaS-level UI design, allowing users to attend AI-driven mock HR interviews with voice interaction, real-time responses, and performance analytics.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide React, Socket.io-client, React Speech Recognition
- **Backend**: Node.js, Express.js, MongoDB, Socket.io, JSONWebToken, OpenAI API

## Features
- 🎨 **Premium UI/UX**: Glassmorphism, smooth animations, and responsive design
- 🎙️ **Voice Interaction**: Real-time speech-to-text (STT) and text-to-speech (TTS)
- 🧠 **AI Evaluation**: OpenAI integration for adaptive questioning and scoring
- ⚡ **Real-time Engine**: Socket.io for dynamic interview flow and feedback
- 📊 **Analytics**: Dashboard with history, scores, and performance metrics

## Prerequisites
- Node.js (v18+)
- MongoDB running locally (or update MONGO_URI)
- OpenAI API Key

## Installation & Setup

### 1. Backend Setup
```bash
cd server
npm install
```

Configure Environment Variables (`server/.env`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-hr-interview
JWT_SECRET=supersecretkey_for_jwt_hr_app_2026
OPENAI_API_KEY=your_openai_api_key_here
```

Start the Backend server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
```

Start the Frontend server:
```bash
npm run dev
```

## How to use
1. Register an account and login to the Dashboard.
2. Enter a job role (e.g., "Frontend Developer", "Marketing Manager") and click **Start New Interview**.
3. Allow microphone permissions.
4. Click the microphone icon, answer the AI's question, and click **Submit Answer**.
5. After 5 questions, the interview will complete, and you will see your detailed performance report and score.
