// src/context/SessionContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessionId, setSessionId] = useState(null);
  const [currentRound, setCurrentRound] = useState('home'); // home | resume | aptitude | coding | interview | results
  const [resumeData, setResumeData] = useState(null);
  const [aptitudeResults, setAptitudeResults] = useState(null);
  const [codingResults, setCodingResults] = useState(null);
  const [interviewResults, setInterviewResults] = useState(null);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [proctoringWarnings, setProctoringWarnings] = useState([]);

  const addProctoringWarning = useCallback((warning) => {
    setProctoringWarnings(prev => [...prev, { ...warning, id: Date.now() }]);
  }, []);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setCurrentRound('home');
    setResumeData(null);
    setAptitudeResults(null);
    setCodingResults(null);
    setInterviewResults(null);
    setProctoringActive(false);
    setProctoringWarnings([]);
  }, []);

  return (
    <SessionContext.Provider value={{
      sessionId, setSessionId,
      currentRound, setCurrentRound,
      resumeData, setResumeData,
      aptitudeResults, setAptitudeResults,
      codingResults, setCodingResults,
      interviewResults, setInterviewResults,
      proctoringActive, setProctoringActive,
      proctoringWarnings, addProctoringWarning,
      resetSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
