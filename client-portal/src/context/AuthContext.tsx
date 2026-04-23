import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const fetchUser = useCallback(async () => {
    try {
      const userData = await authApi.getMe()
      if (userData.user_type !== 'client') {
        clearSession()
        return
      }
      setUser(userData)
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      void fetchUser()
    } else {
      setIsLoading(false)
    }
  }, [fetchUser])

  const login = async (username: string, password: string) => {
    const tokens = await authApi.login(username, password)
    localStorage.setItem('access_token', tokens.access)
    localStorage.setItem('refresh_token', tokens.refresh)
    const userData = await authApi.getMe()
    if (userData.user_type !== 'client') {
      clearSession()
      throw new Error('Solo los usuarios con perfil cliente pueden acceder al portal.')
    }
    setUser(userData)
  }

  const logout = () => {
    clearSession()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
