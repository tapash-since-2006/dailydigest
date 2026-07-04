import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import DigestPage from './pages/DigestPage'
import DashboardPage from './pages/DashboardPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BookmarksPage from './pages/BookmarksPage'
import ComparePage from './pages/ComparePage'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function todayIST() {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3600000 - now.getTimezoneOffset() * 60000)
  return ist.toISOString().slice(0, 10)
}

function AppShell() {
  useKeyboardShortcuts()
  const location = useLocation()
  const hideNavbar = ['/login', '/register'].includes(location.pathname)

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {!hideNavbar && <Navbar />}
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/"                element={<HomePage />} />
            <Route path="/digest"          element={<Navigate to={`/digest/${todayIST()}`} replace />} />
            <Route path="/digest/:date"    element={<DigestPage />} />
            <Route path="/search"          element={<SearchPage />} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/dashboard"       element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/bookmarks"       element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
            <Route path="/compare"         element={<ComparePage />} />
            <Route path="*"                element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center', padding: '40px 16px' }}>
      <p style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '5rem', color: 'var(--accent)', lineHeight: 1 }}>404</p>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink)' }}>Page Not Found</h1>
      <p style={{ fontSize: '14px', color: 'var(--ink-4)' }}>The page you're looking for doesn't exist.</p>
      <a href="/" className="btn-primary">Go Home</a>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
