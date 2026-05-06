import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Clock, Award, BarChart3, ArrowRight, UploadCloud } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/interview', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setInterviews(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, [user.token]);

  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setIsStarting(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const { data } = await axios.post('http://localhost:5000/api/interview/start', 
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      navigate(`/interview/${data.interviewId}`);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user.name.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500">Ready for your next mock interview?</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Start New Interview Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <div className="glass p-8 rounded-3xl sticky top-24">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
              <Plus size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Start Interview</h2>
            <p className="text-sm text-slate-500 mb-6">Upload your resume to generate dynamic, personalized interview questions.</p>
            
            <form onSubmit={handleStartInterview}>
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-3">Upload Resume (PDF)</label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl hover:border-primary-500 bg-white/50 hover:bg-primary-50/50 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-slate-100 text-slate-400 group-hover:bg-primary-100 group-hover:text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                      <UploadCloud size={24} />
                    </div>
                    {file ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-primary-600 truncate px-4">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-500">PDF documents only (Max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isStarting || !file}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-xl flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Start Practice <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* History and Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Clock size={20} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">{interviews.length}</h3>
              <p className="text-sm font-medium text-slate-500">Total Interviews</p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <Award size={20} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">
                {interviews.length > 0 
                  ? Math.round(interviews.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / interviews.length) + '%' 
                  : '0%'}
              </h3>
              <p className="text-sm font-medium text-slate-500">Average Score</p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <BarChart3 size={20} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-1">Top 15%</h3>
              <p className="text-sm font-medium text-slate-500">Global Ranking</p>
            </div>
          </div>

          {/* Interview History */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Interviews</h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex space-x-4 glass p-6 rounded-2xl">
                    <div className="rounded-full bg-slate-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-12 glass rounded-3xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No interviews yet</h3>
                <p className="text-slate-500">Start your first mock interview to see your history here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((interview, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={interview._id} 
                    className="glass p-6 rounded-2xl flex items-center justify-between hover:shadow-lg transition-shadow group cursor-pointer"
                    onClick={() => navigate(interview.status === 'completed' ? `/result/${interview._id}` : `/interview/${interview._id}`)}
                  >
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{interview.jobRole}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          interview.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {interview.status === 'completed' && (
                        <div className="text-right hidden sm:block">
                          <div className="text-sm text-slate-500">Score</div>
                          <div className="font-bold text-slate-900">{Math.round(interview.overallScore)}%</div>
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
