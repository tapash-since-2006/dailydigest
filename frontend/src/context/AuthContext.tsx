import { createContext, useContext, useState, ReactNode } from 'react'

interface User { id: number; email: string; createdAt: string }
interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null,
  login: () => {}, logout: () => {},
  isAuthenticated: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('dd_user') ?? 'null') } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dd_token'))

  const login = (t: string, u: User) => {
    setToken(t); setUser(u)
    localStorage.setItem('dd_token', t)
    localStorage.setItem('dd_user', JSON.stringify(u))
  }

  const logout = () => {
    setToken(null); setUser(null)
    localStorage.removeItem('dd_token')
    localStorage.removeItem('dd_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
