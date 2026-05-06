// src/pages/ResumePage.js
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../context/SessionContext';
import { uploadResume } from '../utils/api';
import Navbar from '../components/shared/Navbar';
import LoadingScreen from '../components/shared/LoadingScreen';

export default function ResumePage() {
  const navigate = useNavigate();
  const { setSessionId, setResumeData } = useSession();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const handleFile = useCallback((f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB.');
      return;
    }
    setError('');
    setFile(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await uploadResume(formData, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      setSessionId(res.sessionId);
      setResumeData(res.analysis);
      setAnalysis(res.analysis);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleProceed = () => navigate('/aptitude');

  const atsColor = analysis?.atsScore >= 80 ? '#10b981' : analysis?.atsScore >= 60 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (circumference * (analysis?.atsScore || 0)) / 100;

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <Navbar currentStep={1} />
      {uploading && <LoadingScreen message="Analyzing Resume…" sub="AI is parsing your resume and generating insights" />}

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}>
            Round 1 — Resume Analysis
          </h1>
          <p className="text-gray-500">Upload your resume for AI-powered ATS scoring and skill extraction</p>
        </motion.div>

        {!analysis ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-8">
            {/* Upload Zone */}
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                  dragging ? 'border-accent bg-orange-50 scale-105' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary bg-white'
                }`}
                style={dragging ? { borderColor: '#ff5722' } : file ? {} : {}}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                <div className="text-5xl mb-4">{file ? '✅' : '📄'}</div>
                {file ? (
                  <>
                    <p className="font-bold text-green-700">{file.name}</p>
                    <p className="text-sm text-green-500 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-700 mb-1">Drop your resume here</p>
                    <p className="text-sm text-gray-400">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-3">PDF / DOCX — max 10MB</p>
                  </>
                )}
              </div>

              {progress > 0 && progress < 100 && (
                <div className="mt-4">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: '#ff5722', width: `${progress}%` }}
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  ⚠️ {error}
                </motion.div>
              )}

              <motion.button
                onClick={handleUpload}
                disabled={!file || uploading}
                whileHover={{ scale: file ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 w-full py-4 rounded-2xl text-white font-bold text-lg transition-all disabled:opacity-40"
                style={{ background: '#ff5722', fontFamily: 'Syne, sans-serif' }}
              >
                {uploading ? 'Analyzing…' : '🔍 Analyze Resume'}
              </motion.button>
            </div>

            {/* Info panel */}
            <div className="space-y-4">
              {[
                { icon: '🎯', title: 'ATS Score', desc: 'Get your Applicant Tracking System compatibility score out of 100' },
                { icon: '🧠', title: 'Skill Extraction', desc: 'AI identifies your technical and soft skills automatically' },
                { icon: '💡', title: 'Smart Suggestions', desc: 'Actionable improvements to boost your resume quality' },
                { icon: '📊', title: 'Gap Analysis', desc: 'Discover missing skills for your target role' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Analysis Results */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* ATS Score + Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Score Ring */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={atsColor} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
                  <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight="bold" fill={atsColor}>{analysis.atsScore}</text>
                  <text x="50" y="68" textAnchor="middle" fontSize="9" fill="#9ca3af">ATS Score</text>
                </svg>
                <p className="text-sm font-semibold mt-2" style={{ color: atsColor }}>
                  {analysis.atsScore >= 80 ? '🟢 Excellent' : analysis.atsScore >= 60 ? '🟡 Good' : '🔴 Needs Work'}
                </p>
              </div>

              {/* Skills */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>🛠 Detected Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.skills || []).map(skill => (
                    <span key={skill} className="px-2 py-1 rounded-lg text-xs font-medium text-white"
                      style={{ background: '#0a0a5c' }}>{skill}</span>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>📝 Summary</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{analysis.summary || 'AI-analyzed your professional background.'}</p>
                <div className="mt-3 space-y-1">
                  {(analysis.strengths || []).slice(0, 3).map(s => (
                    <div key={s} className="flex items-center gap-1.5 text-xs text-green-700">
                      <span>✓</span><span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions + Missing Skills */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>💡 AI Suggestions</h3>
                <ul className="space-y-2">
                  {(analysis.suggestions || []).map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                      <span className="text-orange-500 font-bold mt-0.5">→</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>🎯 Skill Gaps</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.missingSkills || []).map(s => (
                    <span key={s} className="px-3 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 border border-red-200">{s}</span>
                  ))}
                </div>
                <h3 className="font-bold text-gray-800 mt-4 mb-2 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>📋 Formatting Issues</h3>
                <ul className="space-y-1">
                  {(analysis.formattingIssues || []).map((f, i) => (
                    <li key={i} className="text-xs text-gray-500">• {f}</li>
                  ))}
                </ul>
              </div>
            </div>

            <motion.button onClick={handleProceed} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg"
              style={{ background: '#0a0a5c', fontFamily: 'Syne, sans-serif' }}>
              Continue to Aptitude Test →
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
