import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading, configured } = useAuth()
  const location = useLocation()

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <div className="max-w-md rounded-card p-6" style={{ background: 'var(--surface)' }}>
          <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Supabase not configured</p>
          <p className="mt-2 text-body" style={{ color: 'var(--text-secondary)' }}>
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run the authenticated app.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}
