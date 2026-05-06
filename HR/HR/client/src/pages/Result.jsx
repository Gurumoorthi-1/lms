import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Award, Target, MessageSquare, Download, ChevronRight, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Result = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/api/interview/result/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setInterview(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id, user.token]);

  if (loading || !interview) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const score = Math.round(interview.overallScore || 0);

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    // Add title and basic info
    doc.setFontSize(22);
    doc.setTextColor(20, 184, 166); // primary-500
    doc.text("Interview Performance Report", 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Job Role: ${interview.jobRole}`, 14, 35);
    doc.text(`Candidate Name: ${user.name}`, 14, 42);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 49);
    doc.text(`Overall Score: ${score}%`, 14, 56);

    // Add Metrics section
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Performance Metrics", 14, 70);
    
    const metricsData = [
      ["Communication", `${interview.metrics?.communication || 80}%`],
      ["Confidence", `${interview.metrics?.confidence || 85}%`],
      ["Clarity of Thought", `${interview.metrics?.clarity || 75}%`]
    ];

    autoTable(doc, {
      startY: 75,
      head: [['Metric', 'Score']],
      body: metricsData,
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166] }
    });

    // Add Feedback
    const finalY = doc.lastAutoTable?.finalY || 100;
    doc.setFontSize(16);
    doc.text("Actionable Feedback", 14, finalY + 15);
    doc.setFontSize(11);
    const splitFeedback = doc.splitTextToSize(interview.overallFeedback || "Great performance overall.", 180);
    doc.text(splitFeedback, 14, finalY + 22);

    // Add Detailed Review
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Detailed Question Review", 14, 22);

    const questionsData = interview.questions.map((q, idx) => [
      idx + 1,
      q.questionText,
      q.userAnswer || "N/A",
      `${q.score || 0}/10`,
      q.feedback || "N/A"
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['#', 'Question', 'Your Answer', 'Score', 'Feedback']],
      body: questionsData,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] },
      columnStyles: {
        1: { cellWidth: 40 },
        2: { cellWidth: 60 },
        4: { cellWidth: 50 }
      }
    });

    doc.save(`${user.name}_${interview.jobRole}_Report.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 text-white mb-6 shadow-xl shadow-green-500/30 border-4 border-white"
        >
          <Award size={48} />
        </motion.div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Interview Completed!</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          You've successfully completed the {interview.jobRole} mock interview. Here is your comprehensive performance report.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        {/* Score Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 glass p-8 rounded-3xl text-center flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-bl-full -z-10 opacity-50"></div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-6">Overall Score</h2>
          
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <motion.circle 
                initial={{ strokeDasharray: "0 300" }}
                animate={{ strokeDasharray: `${(score / 100) * 283} 300` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                className={score > 75 ? "text-green-500" : score > 50 ? "text-amber-500" : "text-red-500"}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-900">{score}%</span>
            </div>
          </div>
          
          <p className="text-slate-600 mb-8">
            {score > 80 ? "Excellent performance! You are well prepared." : 
             score > 60 ? "Good effort, but there's room for improvement." : 
             "Keep practicing. Focus on structured answers."}
          </p>

          <button 
            onClick={handleDownloadReport}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center group"
          >
            <Download className="w-5 h-5 mr-2 text-slate-400 group-hover:text-primary-500 transition-colors" /> Download Report
          </button>
        </motion.div>

        {/* Detailed Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass p-8 rounded-3xl"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Performance Metrics</h2>
          
          <div className="space-y-8">
            {[
              { label: "Communication Skills", value: interview.metrics?.communication || 80, color: "bg-blue-500" },
              { label: "Confidence", value: interview.metrics?.confidence || 85, color: "bg-purple-500" },
              { label: "Clarity of Thought", value: interview.metrics?.clarity || 75, color: "bg-emerald-500" }
            ].map((metric, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-2">
                  <span className="font-semibold text-slate-700">{metric.label}</span>
                  <span className="font-bold text-slate-900">{metric.value}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 1, delay: 0.2 + (idx * 0.1) }}
                    className={`h-full rounded-full ${metric.color}`}
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-500" /> AI Actionable Feedback
            </h3>
            <p className="text-indigo-800/80 leading-relaxed">
              {interview.overallFeedback || "You communicated well overall. To improve further, try to provide more specific examples from your past experience using the STAR method (Situation, Task, Action, Result)."}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Question by Question Review */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-3xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-200/50 bg-white/50">
          <h2 className="text-2xl font-bold text-slate-900">Detailed Review</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {interview.questions.map((q, idx) => (
            <div key={idx} className="p-8 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start mb-6">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0 mr-4">
                  Q{idx + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-1">{q.questionText}</h3>
              </div>
              
              <div className="ml-12 space-y-6">
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Your Answer</div>
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl text-slate-700 leading-relaxed shadow-sm">
                    {q.userAnswer || "No answer provided."}
                  </div>
                </div>
                
                <div className="flex items-start bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <MessageSquare className="w-5 h-5 text-amber-500 mr-3 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-slate-900 mb-1">Feedback (Score: <span className="font-bold text-amber-600">{q.score || 0}/10</span>)</div>
                    <p className="text-slate-600 leading-relaxed text-sm">{q.feedback || "Good answer."}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-12 text-center">
        <Link to="/dashboard" className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
          <CheckCircle2 className="w-5 h-5" /> <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default Result;
