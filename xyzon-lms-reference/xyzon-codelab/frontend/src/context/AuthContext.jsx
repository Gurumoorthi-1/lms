import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('xl_token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchMe() {
    try {
      const { data } = await axios.get(`${API}/auth/me`)
      setUser(data.user)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data } = await axios.post(`${API}/auth/login`, { email, password })
    localStorage.setItem('xl_token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function register(name, email, password) {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, password })
    localStorage.setItem('xl_token', data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }

  function logout() {
    localStorage.removeItem('xl_token')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  function updateUser(updates) {
    setUser(prev => ({ ...prev, ...updates }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
