// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import HomePage from './pages/HomePage';
import ResumePage from './pages/ResumePage';
import AptitudePage from './pages/AptitudePage';
import CodingPage from './pages/CodingPage';
import InterviewPage from './pages/InterviewPage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/aptitude" element={<AptitudePage />} />
          <Route path="/coding" element={<CodingPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
