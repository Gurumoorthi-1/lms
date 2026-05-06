import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BrainCircuit, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to={user ? "/dashboard" : "/login"} className="flex items-center space-x-2">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-tr from-primary-500 to-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-primary-500/30"
            >
              <BrainCircuit size={24} />
            </motion.div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              IntervAI
            </span>
          </Link>
          
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                  Dashboard
                </Link>
                <div className="flex items-center space-x-4 bg-slate-100/50 py-1.5 px-4 rounded-full border border-slate-200/50">
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary-100 p-1 rounded-full text-primary-600">
                      <User size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{user.name}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-300"></div>
                  <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors">
                    <LogOut size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-full font-medium transition-all shadow-md shadow-slate-900/20 hover:shadow-lg hover:-translate-y-0.5">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
