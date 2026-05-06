// src/components/proctoring/ProctoringPanel.js
// Enhanced with Feature 1: Object Detection bounding boxes + warning UI
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useObjectDetection } from '../../hooks/useObjectDetection';

export default function ProctoringPanel({
  videoRef,
  cameraReady,
  warnings,
  permissionError,
  sessionId,
  round,
}) {
  const canvasRef = useRef(null);

  const { detectionWarnings, isModelLoaded } = useObjectDetection({
    videoRef,
    canvasRef,
    sessionId,
    round,
    enabled: cameraReady,
  });

  const allWarnings = [
    ...detectionWarnings,
    ...warnings.filter(w => !detectionWarnings.find(d => d.key === w.type)).slice(0, 5),
  ].slice(0, 8);

  const criticalActive = detectionWarnings.some(w => w.severity === 'critical');

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-xl overflow-hidden bg-gray-900"
        style={{ border: `2px solid ${criticalActive ? '#ef4444' : '#ff5722'}` }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full object-cover"
          style={{ height: '160px', transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ height: '160px', transform: 'scaleX(-1)' }}
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            {permissionError ? (
              <div className="text-center p-3">
                <span className="text-2xl">🚫</span>
                <p className="text-red-400 text-xs mt-1">Camera denied</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="spinner mx-auto" style={{ borderTopColor: '#ff5722' }} />
                <p className="text-gray-400 text-xs mt-2">Starting camera…</p>
              </div>
            )}
          </div>
        )}
        {cameraReady && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-medium">LIVE</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isModelLoaded ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-white text-xs">{isModelLoaded ? 'AI ON' : 'Loading…'}</span>
        </div>
        <AnimatePresence>
          {criticalActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs text-center py-1 font-bold"
            >
              🚨 VIOLATION DETECTED
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Camera', ok: cameraReady, icon: '📹' },
          { label: 'Mic',    ok: cameraReady, icon: '🎤' },
          { label: 'AI Watch', ok: isModelLoaded, icon: '🤖' },
        ].map(({ label, ok, icon }) => (
          <div key={label} className={`rounded-lg p-2 text-center text-xs ${ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-base">{icon}</div>
            <div className={ok ? 'text-green-700 font-medium' : 'text-red-600'}>{label}</div>
            <div className={`text-xs ${ok ? 'text-green-500' : 'text-red-400'}`}>{ok ? 'Active' : 'Off'}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <span className="text-xs font-semibold text-gray-700">Proctoring Alerts</span>
          {allWarnings.length > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{allWarnings.length}</span>
          )}
        </div>
        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
          <AnimatePresence>
            {allWarnings.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No alerts</p>
            ) : (
              allWarnings.map((w, i) => (
                <motion.div
                  key={w.id || w.key || w.type || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`px-3 py-2 text-xs ${
                    w.severity === 'critical' ? 'bg-red-50 text-red-700' :
                    w.severity === 'error'    ? 'bg-orange-50 text-orange-700' :
                                                'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  <div className="font-medium">{w.message}</div>
                  <div className="opacity-60">{w.time}</div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
