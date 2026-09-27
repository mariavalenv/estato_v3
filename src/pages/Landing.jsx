import { useNavigate } from 'react-router-dom'

export function Landing() {
  const navigate = useNavigate()

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
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-8 px-5 py-3 rounded-btn font-semibold"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
        >
          Enter Estato
        </button>
      </div>
    </div>
  )
}
