import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CodeLabPage from './pages/CodeLabPage'
import ChallengesPage from './pages/ChallengesPage'
import Toast from './components/Toast'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:32,height:32}}></div></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" style={{width:32,height:32,borderWidth:3}}></div></div>

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/codelab" replace />} />
            <Route path="/login" element={user ? <Navigate to="/codelab" /> : <LoginPage />} />
            <Route path="/register" element={user ? <Navigate to="/codelab" /> : <RegisterPage />} />
            <Route path="/codelab" element={<CodeLabPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="*" element={<Navigate to="/codelab" replace />} />
          </Routes>
        </main>
      </div>
      <Toast />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
