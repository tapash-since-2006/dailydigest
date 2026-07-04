import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Input, Button, ErrorBanner } from '../components/UI'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login: authLogin } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    try {
      const data = await register(email, password)
      authLogin(data.token, data.user)
      showToast('Account created. Welcome to The Daily Digest.', 'success')
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
            Create your account
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--rule)', marginBottom: '28px' }} />

        {error && <div style={{ marginBottom: '20px' }}><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" required />
          <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
          <Button type="submit" loading={loading} style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}>
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink-4)', marginTop: '20px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
