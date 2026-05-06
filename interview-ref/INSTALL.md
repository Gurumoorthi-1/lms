# AI Interview System — Feature Enhancement Install Guide
## Features Added: Object Detection · Resume Questions · Emotion Analysis

---

## 🔴 Feature 1 — Object Detection (COCO-SSD)
No npm install needed. TF.js + COCO-SSD load via CDN at runtime.
CDNs injected automatically by `useObjectDetection.js`:
- https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js
- https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js

## 🟢 Feature 2 — Resume-Based Questions
No new npm packages. Uses existing: `pdf-parse`, `mammoth`, `@anthropic-ai/sdk`

## 🔵 Feature 3 — Emotion Analysis (face-api.js)
No npm install needed. face-api.js loads via CDN at runtime:
- https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js
- Models: https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model

---

## Quick Setup

### 1. Backend
```bash
cd backend
npm install
# Create .env:
echo "ANTHROPIC_API_KEY=your_key_here
MONGODB_URI=mongodb://localhost:27017/ai-interview
PORT=5000" > .env
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm start
```

---

## Files Modified / Added

### NEW Frontend Files:
- `src/hooks/useObjectDetection.js`     ← Feature 1: COCO-SSD detection
- `src/hooks/useEmotionAnalysis.js`     ← Feature 3: face-api.js emotions
- `src/components/emotion/EmotionPanel.js`   ← Feature 3: live metrics UI
- `src/components/emotion/EmotionReport.js`  ← Feature 3: end-of-interview report

### MODIFIED Frontend Files:
- `src/components/proctoring/ProctoringPanel.js`  ← Integrated object detection
- `src/pages/CodingPage.js`            ← Feature 2: resume questions + auto lang
- `src/pages/InterviewPage.js`         ← Feature 3: emotion analysis integrated
- `src/pages/ResultsPage.js`           ← Proctoring + emotion summary tab
- `src/utils/api.js`                   ← saveEmotionReport() added

### NEW Backend Files:
(none — extended existing controllers)

### MODIFIED Backend Files:
- `backend/controllers/codingController.js`    ← Feature 2: resume question gen
- `backend/controllers/analyticsController.js` ← Feature 1+3: violations + emotion
- `backend/routes/analyticsRoutes.js`          ← Feature 3: /emotion-report route
- `backend/models/Session.js`                  ← Extended schema for all 3 features

---

## Architecture Notes

### Feature 1 (Object Detection)
- Runs every 1.5s via setInterval in `useObjectDetection`
- Violations logged after 5s continuous detection → POST /api/analytics/proctoring-event
- Bounding boxes drawn on <canvas> overlay (mirror-flipped to match video)
- Warning types: phone, multi_person, no_face, book

### Feature 2 (Resume Questions)
- Language auto-detected from resume skills list (priority: Python > Java > C++ > TS > JS)
- Claude generates 5 problems (1E+2M+2H) from resume context
- Each problem has resumeRelevance field shown in UI
- Language dropdown REMOVED — replaced with auto-detected badge

### Feature 3 (Emotion Analysis)
- face-api.js CDN with TinyFaceDetector + FaceExpressionNet models
- Samples every 2s → builds emotionHistory array (max 60 entries)
- Confidence = f(happy, neutral); Nervousness = f(fearful, sad)
- Report generated at interview end → saved to MongoDB via /emotion-report
- Shown in Results page under "Proctoring" tab
