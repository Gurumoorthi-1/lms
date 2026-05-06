import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Interview from './pages/Interview';
import Result from './pages/Result';

const PrivateRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-primary-200">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={
                <AuthContext.Consumer>
                  {({ user }) => user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                </AuthContext.Consumer>
              } />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/interview/:id" element={<PrivateRoute><Interview /></PrivateRoute>} />
              <Route path="/result/:id" element={<PrivateRoute><Result /></PrivateRoute>} />
              <Route path="*" element={
                <AuthContext.Consumer>
                  {({ user }) => user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                </AuthContext.Consumer>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
