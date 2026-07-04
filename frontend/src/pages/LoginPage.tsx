import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Input, Button, ErrorBanner } from '../components/UI'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login: authLogin } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data = await login(email, password)
      authLogin(data.token, data.user)
      showToast(`Welcome back, ${data.user.email.split('@')[0]}`, 'success')
      navigate('/')
    } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: '1.6rem', color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            The Daily Digest
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            Sign in to your account
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--rule)', marginBottom: '28px' }} />

        {error && <div style={{ marginBottom: '20px' }}><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          <Button type="submit" loading={loading} className="w-full" style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}>
            Sign In
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink-4)', marginTop: '20px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500 }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
