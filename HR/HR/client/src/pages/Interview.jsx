import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, User, Volume2, Loader2, StopCircle, Timer as TimerIcon, Activity } from 'lucide-react';
import axios from 'axios';
import ProctoringMonitor from '../components/proctoring/ProctoringMonitor';

let socket;

const Interview = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const chatEndRef = useRef(null);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const [textAnswer, setTextAnswer] = useState('');

  useEffect(() => {
    setTextAnswer(transcript);
  }, [transcript]);

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0 && !isAiThinking) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAiThinking) {
      handleSubmitAnswer();
    }
  }, [timeLeft, isAiThinking]);

  useEffect(() => {
    socket = io('http://localhost:5000');
    socket.emit('join_interview', id);

    const fetchInterview = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/api/interview/result/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        
        if (data.status === 'completed') {
          navigate(`/result/${id}`, { replace: true });
          return;
        }

        setInterview(data);
        setCurrentQuestionIndex(data.questions.findIndex(q => !q.userAnswer));
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInterview();

    socket.on('next_question', (data) => {
      setIsAiThinking(false);
      setFeedback(data.feedback);
      setTimeLeft(60); // Reset timer
      
      setInterview(prev => {
        if (!prev) return prev;
        const questionExists = prev.questions.some(q => q.questionText === data.question);
        if (questionExists) return prev;

        return {
          ...prev,
          questions: [...prev.questions, { questionText: data.question }]
        };
      });
      
      setCurrentQuestionIndex(data.questionIndex);
      speak(data.question);
    });

    socket.on('interview_completed', (data) => {
      navigate(`/result/${data.interviewId}`, { replace: true });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, user.token, navigate]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [interview?.questions?.length, currentQuestionIndex, textAnswer]);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  const startListening = () => {
    resetTranscript();
    setTextAnswer('');
    // Use browser's language for better accuracy, fallback to en-US
    const lang = navigator.language || 'en-US';
    SpeechRecognition.startListening({ 
      continuous: true, 
      language: lang
    });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleSubmitAnswer = () => {
    const finalAnswer = textAnswer.trim() || "Candidate did not provide a verbal answer in time.";
    
    stopListening();
    setIsAiThinking(true);
    
    socket.emit('submit_answer', {
      interviewId: id,
      answer: finalAnswer,
      currentQuestionIndex
    });
    
    setInterview(prev => {
      if (!prev) return prev;
      const newQuestions = [...prev.questions];
      if (newQuestions[currentQuestionIndex]) {
        newQuestions[currentQuestionIndex] = {
          ...newQuestions[currentQuestionIndex],
          userAnswer: finalAnswer
        };
      }
      return {
        ...prev,
        questions: newQuestions
      };
    });
    
    resetTranscript();
    setTextAnswer('');
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center p-8 text-center">
        <div className="glass p-10 rounded-3xl max-w-md">
           <h2 className="text-2xl font-bold text-red-600 mb-4">Browser Not Supported</h2>
           <p className="text-slate-600 mb-6">Your browser doesn't support speech recognition. Please use Google Chrome for the best experience.</p>
           <button onClick={() => navigate('/dashboard')} className="bg-slate-900 text-white px-6 py-2 rounded-full">Go Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)] flex flex-col md:flex-row gap-6">
      <ProctoringMonitor 
        interviewId={id} 
        userId={user.id} 
        token={user.token} 
      />
      
      {/* Left side - Avatar / Stats */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        {/* AI Avatar */}
        <div className="glass rounded-3xl overflow-hidden shadow-lg relative aspect-square bg-slate-900 flex items-center justify-center border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 via-transparent to-slate-950 z-10" />
          
          <div className="relative z-20 text-center w-full h-full flex flex-col items-center justify-center">
            <motion.div 
              animate={{ 
                scale: isAiThinking ? [1, 1.05, 1] : [1, 1.02, 1],
                y: [0, -5, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: isAiThinking ? 2 : 5,
                ease: "easeInOut"
              }}
              className={`relative w-48 h-48 mx-auto rounded-full mb-6 border-4 shadow-2xl overflow-hidden bg-slate-800 transition-colors duration-500 ${isAiThinking ? 'border-primary-500 shadow-primary-500/40' : 'border-indigo-500/50 shadow-indigo-500/20'}`}
            >
              <img 
                src="/ai-avatar.png" 
                alt="AI Interviewer" 
                className={`w-full h-full object-cover transition-all duration-1000 ${isAiThinking ? 'brightness-110 saturate-110 scale-110' : 'brightness-90 saturate-100 scale-100'}`}
              />
              
              {/* Thinking Overlay */}
              <AnimatePresence>
                {isAiThinking && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px] flex items-center justify-center"
                  >
                    <div className="flex items-end space-x-1.5 h-8">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            height: [8, 24, 8],
                            backgroundColor: ['#14b8a6', '#6366f1', '#14b8a6']
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6,
                            delay: i * 0.1,
                          }}
                          className="w-1.5 rounded-full bg-primary-500"
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">AI HR Specialist</h3>
            <div className="flex items-center justify-center space-x-3 bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
              <span className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-primary-500 animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.8)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]'}`}></span>
              <span className="font-bold tracking-widest uppercase text-[10px] text-slate-300">
                {isAiThinking ? 'Analyzing Response' : 'Live & Listening'}
              </span>
            </div>
          </div>

          {/* Timer Overlay */}
          <div className="absolute top-6 right-6 z-30">
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border border-white/20 flex items-center shadow-lg ${timeLeft < 15 ? 'bg-red-500 text-white animate-pulse' : 'bg-black/40 text-white'}`}>
              <TimerIcon size={16} className="mr-2" />
              <span className="text-sm font-bold font-mono">{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Feedback Box */}
        <div className="glass p-5 rounded-3xl flex-1 flex flex-col border border-white/10">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center text-sm">
            <Activity size={16} className="mr-2 text-primary-500" /> Recent Performance Feedback
          </h3>
          <div className="flex-1 overflow-y-auto">
            {feedback ? (
              <div className="bg-primary-50/50 p-4 rounded-2xl border border-primary-100">
                <p className="text-slate-700 text-xs italic leading-relaxed">"{feedback}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale text-center p-4">
                <Volume2 size={24} className="mb-2" />
                <p className="text-[10px] font-medium text-slate-500">Analysis will appear here as you answer questions.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Chat Interaction */}
      <div className="w-full md:w-2/3 glass rounded-3xl flex flex-col overflow-hidden shadow-lg border border-slate-200/60 relative">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200/50 bg-white/50 backdrop-blur-md flex justify-between items-center z-10 sticky top-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{interview?.jobRole || 'Resume'} Interview</h2>
            <p className="text-sm text-slate-500">Live Assessment Mode</p>
          </div>
          <div className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
             <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Question</span>
             <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
               {currentQuestionIndex + 1}
             </span>
          </div>
        </div>

        {/* Chat / Transcript Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
          <AnimatePresence>
            {interview?.questions.map((q, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* AI Question */}
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4 shrink-0 mt-1">
                    <User size={16} />
                  </div>
                  <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%]">
                    <p className="text-slate-800 leading-relaxed font-medium">{q.questionText}</p>
                  </div>
                </div>

                {/* User Answer */}
                {(q.userAnswer || (idx === currentQuestionIndex && textAnswer)) && (
                  <div className="flex items-start justify-end">
                    <div className="bg-primary-500 text-white px-6 py-4 rounded-2xl rounded-tr-sm shadow-md max-w-[85%] overflow-hidden">
                      <p className="leading-relaxed">{q.userAnswer || textAnswer}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center ml-4 shrink-0 mt-1">
                      {user.name.charAt(0)}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isAiThinking && (
             <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4 shrink-0 mt-1">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 px-6 py-4 rounded-2xl rounded-tl-sm shadow-sm flex space-x-1 items-center">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Controls */}
        <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-200/50">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            <div className="flex-1 w-full relative">
              {listening && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full flex items-center shadow-lg animate-pulse">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span> Listening...
                </div>
              )}
              
              <div className="flex items-center space-x-3 w-full">
                <button
                  onClick={listening ? stopListening : startListening}
                  className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    listening 
                      ? 'bg-red-50 text-red-500 ring-2 ring-red-500 ring-offset-2' 
                      : 'bg-primary-500 hover:bg-primary-600 text-white hover:scale-105'
                  }`}
                >
                  {listening ? <StopCircle size={24} /> : <Mic size={24} />}
                </button>
                
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer or click the mic to speak..."
                  className="flex-1 h-14 bg-slate-100 rounded-full border border-slate-200 px-6 outline-none focus:ring-2 focus:ring-primary-300 transition-all text-sm w-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                />
              </div>
            </div>
            
            <button
              onClick={handleSubmitAnswer}
              disabled={!textAnswer.trim() || isAiThinking}
              className="w-full sm:w-auto flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 rounded-full font-semibold transition-all shadow-md hover:shadow-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              Submit Answer 
              <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
