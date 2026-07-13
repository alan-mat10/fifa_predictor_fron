import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await authAPI.login(username, password)
    const { token, username: uname, role, avatar } = res.data
    const userData = { username: uname, role, token, avatar }
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const register = async (username, password, inviteCode, avatar) => {
    const res = await authAPI.register(username, password, inviteCode, avatar)
    const { token, username: uname, role, avatar: av } = res.data
    const userData = { username: uname, role, token, avatar: av }
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('contest_popup_dismissed')
    setUser(null)
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN'

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
