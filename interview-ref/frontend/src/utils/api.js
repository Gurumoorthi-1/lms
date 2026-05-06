// src/utils/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

API.interceptors.request.use(config => config, error => Promise.reject(error));
API.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── Resume ──────────────────────────────────────────────────────────────────
export const uploadResume = (formData, onProgress) =>
  API.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });

export const getResumeAnalysis = (sessionId) => API.get(`/resume/${sessionId}`);

// ── Aptitude ─────────────────────────────────────────────────────────────────
export const generateAptitudeQuestions = (sessionId, totalQuestions) =>
  API.post('/aptitude/generate', { sessionId, totalQuestions });

export const submitAptitudeTest = (sessionId, answers, timeSpent) =>
  API.post('/aptitude/submit', { sessionId, answers, timeSpent });

// ── Coding ───────────────────────────────────────────────────────────────────
export const generateCodingProblems = (sessionId) =>
  API.post('/coding/generate', { sessionId });

export const runCode = (sessionId, problemId, language, code) =>
  API.post('/coding/run', { sessionId, problemId, language, code });

export const submitSolution = (sessionId, problemId, language, code) =>
  API.post('/coding/submit', { sessionId, problemId, language, code });

export const completeCodingRound = (sessionId) =>
  API.post('/coding/complete', { sessionId });

// ── Interview ────────────────────────────────────────────────────────────────
export const generateInterviewQuestions = (sessionId) =>
  API.post('/interview/generate-questions', { sessionId });

export const analyzeInterviewResponse = (sessionId, questionId, answer, question) =>
  API.post('/interview/analyze-response', { sessionId, questionId, answer, question });

export const completeInterview = (sessionId) =>
  API.post('/interview/complete', { sessionId });

// ── Analytics ────────────────────────────────────────────────────────────────
export const getAnalytics = (sessionId) => API.get(`/analytics/${sessionId}`);

export const logProctoringEvent = (sessionId, type, message, severity, round) =>
  API.post('/analytics/proctoring-event', { sessionId, type, message, severity, round });

// Feature 3: Save emotion report at end of HR interview
export const saveEmotionReport = (sessionId, report) =>
  API.post('/analytics/emotion-report', { sessionId, report });

// ── Session ──────────────────────────────────────────────────────────────────
export const getSession = (sessionId) => API.get(`/session/${sessionId}`);

export default API;
