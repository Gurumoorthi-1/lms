'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Maximize2, ShieldAlert } from 'lucide-react';
import { logProctoringEvent } from '@/lib/api';

const SecurityContext = createContext(null);

const TEST_MODE = false; // Proctoring active and copy/paste blocked

/**
 * SecurityProvider - The Unified Security Orchestrator (CSO)
 * Centralizes violation tracking, proctoring listeners, and backend sync.
 */
export const SecurityProvider = ({ children }) => {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [violations, setViolations] = useState([]);
  const [violationCounts, setViolationCounts] = useState({ total: 0, camera: 0, tabSwitch: 0, fs: 0, screenshot: 0 });
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [isSystemAction, setIsSystemAction] = useState(false);
  const [showFsOverlay, setShowFsOverlay] = useState(false);
  const [showScreenshotOverlay, setShowScreenshotOverlay] = useState(false);
  const isSystemActionRef = useRef(false);

  const setSystemAction = useCallback((val) => {
    setIsSystemAction(val);
    isSystemActionRef.current = val;
  }, []);

  const [config, setConfig] = useState({
    sessionId: null,
    round: 'general',
    maxCameraViolations: 4,
    maxTabSwitchViolations: 2,
    maxFsViolations: 2,
    maxScreenshotViolations: 1,
    enabled: false
  });
  const lastToastTimeRef = useRef({});

  const startSecurity = useCallback((options) => {
    console.log('🛡️ Security Orchestrator: Starting session', options.sessionId);
    setConfig({
      sessionId: options.sessionId,
      round: options.round || 'general',
      maxCameraViolations: 4,
      maxTabSwitchViolations: 2,
      maxFsViolations: 2,
      maxScreenshotViolations: 1,
      enabled: true
    });
    setViolations([]);
    setViolationCounts({ total: 0, camera: 0, tabSwitch: 0, fs: 0, screenshot: 0 });
    setIsDisqualified(false);
    setShowFsOverlay(false);
    setShowScreenshotOverlay(false);
    setSystemAction(false);

    // Auto-trigger Fullscreen on start
    setTimeout(() => {
      const el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
      }
    }, 500);
  }, [setSystemAction]);

  const stopSecurity = useCallback(() => {
    console.log('🛡️ Security Orchestrator: Stopping session');
    setConfig(prev => ({ ...prev, enabled: false }));
    setSystemAction(false);
    setShowFsOverlay(false);
    setShowScreenshotOverlay(false);
  }, [setSystemAction]);

  const reportViolation = useCallback(async (type, message, severity = 'warning') => {
    if (!config.enabled || isDisqualified || isSystemActionRef.current) return;
    
    if (TEST_MODE) {
      console.log(`🛡️ [TEST MODE] Violation Suppressed: ${type} - ${message}`);
      return;
    }

    const now = Date.now();
    const isCamera = ['looking_away', 'face_hidden', 'multiple_faces', 'gadget_detected', 'head_movement', 'camera_error', 'face_missing'].includes(type);
    const isTab = ['tab_switch', 'window_blur', 'blur'].includes(type);
    const isFS = ['fullscreen_exit', 'screen_exit'].includes(type);
    const isScreenshot = type === 'screenshot';

    setViolationCounts(prev => {
      const newCounts = {
        total: prev.total + 1,
        camera: isCamera ? prev.camera + 1 : prev.camera,
        tabSwitch: isTab ? prev.tabSwitch + 1 : prev.tabSwitch,
        fs: isFS ? prev.fs + 1 : prev.fs,
        screenshot: isScreenshot ? prev.screenshot + 1 : prev.screenshot
      };

      // Disqualification limits check
      if (
        newCounts.camera >= config.maxCameraViolations ||
        newCounts.tabSwitch >= config.maxTabSwitchViolations ||
        newCounts.fs >= config.maxFsViolations ||
        newCounts.screenshot >= config.maxScreenshotViolations ||
        type === 'tab_switch_timeout'
      ) {
        setIsDisqualified(true);
        setShowFsOverlay(false);
        setShowScreenshotOverlay(false);
      }

      return newCounts;
    });

    const newViolation = {
      id: now,
      ts: now,
      type,
      message,
      severity,
      timestamp: new Date().toISOString()
    };

    setViolations(prev => [...prev, newViolation]);

    // Toast Notification (with 5s cooldown to prevent spam)
    const toastKey = `violation-${type}`;
    if (!lastToastTimeRef.current[type] || now - lastToastTimeRef.current[type] > 5000) {
      let warningText = message;
      if (isCamera) warningText += ` (Camera Attempts: ${violationCounts.camera + 1}/${config.maxCameraViolations})`;
      if (isTab) warningText += ` (Tab Attempts: ${violationCounts.tabSwitch + 1}/${config.maxTabSwitchViolations})`;
      if (isFS) warningText += ` (Fullscreen Attempts: ${violationCounts.fs + 1}/${config.maxFsViolations})`;
      if (isScreenshot) warningText += ` (Screenshot Attempts: ${violationCounts.screenshot + 1}/${config.maxScreenshotViolations})`;

      if (severity === 'critical' || isTab || isFS || isScreenshot) {
        toast.error(warningText, { 
          id: toastKey,
          icon: '🚨', 
          duration: 5000,
          style: { border: '2px solid #ef4444', background: '#fef2f2' }
        });
      } else {
        toast.error(warningText, { id: toastKey, icon: '⚠️' });
      }
      lastToastTimeRef.current = { ...lastToastTimeRef.current, [type]: now };
    }

    // Backend Sync
    if (config.sessionId) {
      if (import.meta.env.VITE_TEST_MODE === 'true') {
        console.log('🛡️ [TEST MODE] Violation Detected but Not Logged:', type, message);
        return;
      }

      try {
        await logProctoringEvent(config.sessionId, type, message, severity, config.round);
      } catch (err) {
        console.error('Failed to sync violation to backend:', err);
      }
    }
  }, [config, isDisqualified, violationCounts]);

  const reenterFullscreen = useCallback(() => {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (request) {
      request.call(el)
        .then(() => {
          setShowFsOverlay(false);
        })
        .catch(err => {
          console.error("Failed to re-enter fullscreen:", err);
          toast.error("Please re-enter fullscreen manually.");
        });
    }
  }, []);

  const clearAndSecureClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText('🚫 Screenshots and copying are strictly prohibited during this exam! Your attempt has been logged.');
      }
    } catch (err) {
      console.warn('Clipboard secure override failed:', err);
    }
  };

  // Global Listeners (Tab/Fullscreen/Shortcuts/Deduplication)
  useEffect(() => {
    if (!config.enabled || isDisqualified) return;
    
    // Security should only be active on assessment pages
    const isCodingPage = pathname?.includes('/student/coding');
    const isAssessmentPage = isCodingPage || 
                             pathname?.includes('/student/aptitude') || 
                             pathname?.includes('/student/mcq') || 
                             pathname?.includes('/student/interview') ||
                             pathname?.includes('/exam-player');

    if (!isAssessmentPage) return;

    const handleVisibility = () => {
      if (document.hidden && !isSystemActionRef.current) {
        reportViolation('tab_switch', 'Proctoring Alert: Tab switch detected.', 'critical');
      }
    };

    const handleBlur = () => {
      if (!isSystemActionRef.current) {
        reportViolation('window_blur', 'Violation: Window lost focus. Possible screenshot, external widget, or application overlay active.', 'critical');
      }
    };

    const handleFsChange = () => {
      if (isSystemActionRef.current) return;
      
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFs) {
        reportViolation('fullscreen_exit', 'Violation: Fullscreen exited unexpectedly.', 'critical');
        setShowFsOverlay(true);
      } else {
        setShowFsOverlay(false);
      }
    };

    const handleKeydown = (e) => {
      if (isSystemActionRef.current) return;

      // Detect screenshot shortcuts inside keydown
      const isWinShiftS = e.metaKey && e.shiftKey && e.key.toLowerCase() === 's';
      const isMacCmdShift = e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(e.key);
      const isPrtScnKey = e.key === 'PrintScreen' || e.keyCode === 44;

      if (isWinShiftS || isMacCmdShift || isPrtScnKey) {
        e.preventDefault();
        e.stopPropagation();
        clearAndSecureClipboard();
        
        setShowScreenshotOverlay(true);
        setTimeout(() => {
          setShowScreenshotOverlay(false);
        }, 1500);

        reportViolation('screenshot', 'Violation: Screenshot or screen capture attempt detected.', 'critical');
        return;
      }

      const forbiddenKeys = ['c', 'v', 'r', 't', 'w', 'f', 'p', 'x'];
      
      // Completely block Ctrl+C, Ctrl+V, Ctrl+X across entire exam process
      const isClipboardAction = (e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase());
      if (isClipboardAction) {
        e.preventDefault();
        toast.error('🚫 Copying/pasting is strictly prohibited during the exam!', { id: 'copy-paste-blocked' });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && forbiddenKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
        reportViolation('keyboard_shortcut', `Blocked restricted shortcut: Ctrl+${e.key.toUpperCase()}`, 'warning');
      }
      
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        reportViolation('devtools', 'DevTools access attempt detected.', 'critical');
      }
    };

    const handleKeyup = (e) => {
      if (isSystemActionRef.current) return;
      const isPrtScnKey = e.key === 'PrintScreen' || e.keyCode === 44;
      if (isPrtScnKey) {
        e.preventDefault();
        clearAndSecureClipboard();
        setShowScreenshotOverlay(true);
        setTimeout(() => {
          setShowScreenshotOverlay(false);
        }, 1500);
        reportViolation('screenshot', 'Violation: Screenshot or PrintScreen attempt detected.', 'critical');
      }
    };

    const preventContext = (e) => {
      e.preventDefault();
      toast.error('🚫 Copying/pasting is strictly prohibited during the exam!', { id: 'copy-paste-blocked' });
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);
    window.addEventListener('contextmenu', preventContext);
    window.addEventListener('copy', preventContext);
    window.addEventListener('paste', preventContext);
    window.addEventListener('cut', preventContext);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      window.removeEventListener('contextmenu', preventContext);
      window.removeEventListener('copy', preventContext);
      window.removeEventListener('paste', preventContext);
      window.removeEventListener('cut', preventContext);
    };
  }, [config.enabled, isDisqualified, reportViolation, pathname]);

  return (
    <SecurityContext.Provider value={{
      violations,
      totalViolations: violations.length,
      violationCounts,
      isDisqualified,
      isSystemAction,
      setSystemAction,
      startSecurity,
      stopSecurity,
      reportViolation,
      config,
      isTestMode: import.meta.env.VITE_TEST_MODE === 'true'
    }}>
      {children}
      {showFsOverlay && !isDisqualified && (
        <div className="fixed inset-0 bg-[#0F172A] z-[9999] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 animate-pulse">
              <Maximize2 size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Fullscreen Required</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                You exited full-screen mode. Remaining in fullscreen is mandatory for assessment security.
              </p>
            </div>
            <button
              onClick={reenterFullscreen}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              Re-enter Fullscreen
            </button>
          </div>
        </div>
      )}
      {showScreenshotOverlay && !isDisqualified && (
        <div className="fixed inset-0 bg-[#0F172A]/95 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 animate-bounce">
              <ShieldAlert size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Screenshot Blocked</h2>
              <p className="text-red-400 text-sm leading-relaxed font-bold">
                Screen capture and screenshots are strictly prohibited! 
              </p>
              <p className="text-slate-400 text-xs">
                This violation attempt has been securely logged to the proctoring database. Remaining attempts: {config.maxScreenshotViolations - violationCounts.screenshot}
              </p>
            </div>
          </div>
        </div>
      )}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
