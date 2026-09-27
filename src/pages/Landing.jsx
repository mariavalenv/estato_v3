import { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../lib/supabase'

function AuthModal({ initialMode, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      if (mode === 'signup') {
        const data = await auth.signUp({ email, password, fullName })
        if (!data.session) {
          setInfo('Account created. Check your email to confirm your account, then sign in.')
          setMode('signin')
          return
        }
      } else {
        await auth.signIn({ email, password })
      }

      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-card p-7 relative" style={{ background: 'var(--surface)' }}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>

        <p className="text-meta font-semibold tracking-[0.18em]" style={{ color: 'var(--accent)' }}>✦ ESTATO</p>
        <h2 className="text-heading font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className="px-4 py-3 rounded-btn outline-none"
              style={{ background: 'var(--background)', border: 'none', color: 'var(--text-primary)' }}
            />
          )}

          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="px-4 py-3 rounded-btn outline-none"
            style={{ background: 'var(--background)', border: 'none', color: 'var(--text-primary)' }}
          />

          <div className="relative">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 pr-12 rounded-btn outline-none"
              style={{ background: 'var(--background)', border: 'none', color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {error && <p className="text-meta" style={{ color: '#F87171' }}>{error}</p>}
          {info && <p className="text-meta" style={{ color: 'var(--success)' }}>{info}</p>}

          <button
            disabled={loading}
            className="mt-1 py-3 rounded-btn font-semibold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.65 : 1 }}
          >
            {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="mt-5 w-full text-meta"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}
          onClick={() => {
            setError('')
            setInfo('')
            setMode((value) => value === 'signup' ? 'signin' : 'signup')
          }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}
        </button>
      </div>
    </div>
  )
}

export function Landing() {
  const navigate = useNavigate()
  const { user, configured } = useAuth()
  const [authMode, setAuthMode] = useState(null)

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl">
        <p className="text-meta font-semibold tracking-[0.18em] mb-4" style={{ color: 'var(--accent)' }}>✦ ESTATO</p>
        <h1 className="text-5xl font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          Find a flat and the people to share it with — with an agent on your side.
        </h1>
        <p className="mt-5 text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Humans, personal agents, and household agents can compare needs, ask questions, and coordinate. You stay in control of the decisions.
        </p>

        {!configured && (
          <p className="mt-5 text-body" style={{ color: 'var(--warning)' }}>
            Supabase environment variables are not configured yet.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-3 rounded-btn font-semibold"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
            >
              Continue to Estato
            </button>
          ) : (
            <>
              <button
                disabled={!configured}
                onClick={() => setAuthMode('signup')}
                className="px-5 py-3 rounded-btn font-semibold"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: configured ? 1 : 0.5 }}
              >
                Create account
              </button>
              <button
                disabled={!configured}
                onClick={() => setAuthMode('signin')}
                className="px-5 py-3 rounded-btn font-semibold"
                style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)', opacity: configured ? 1 : 0.5 }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
    </div>
  )
}
