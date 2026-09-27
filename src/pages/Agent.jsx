import { useEffect, useState } from 'react'
import { Bot, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePersonalAgent } from '../hooks/usePersonalAgent'

const PERMISSION_OPTIONS = [
  { value: 'allowed', label: 'Allowed' },
  { value: 'ask', label: 'Ask first' },
  { value: 'never', label: 'Never' },
]

function PermissionRow({ label, sub, value, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="min-w-0">
        <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</p>
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="shrink-0 px-3 py-2 rounded-btn text-meta outline-none"
        style={{
          minWidth: 112,
          background: 'var(--background)',
          color: value === 'allowed' ? 'var(--success)' : value === 'ask' ? 'var(--accent)' : 'var(--text-secondary)',
          border: '1px solid rgba(255,255,255,0.08)',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {PERMISSION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

export function Agent() {
  const { user } = useAuth()
  const {
    agent,
    permissions,
    loading,
    error,
    savePermissions,
    saveAgent,
  } = usePersonalAgent(user)

  const [status, setStatus] = useState('ready')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (!agent) return
    setName(agent.name || '')
    setBio(agent.bio || '')
  }, [agent])

  async function updatePermission(key, value) {
    if (!permissions) return
    setStatus('saving')
    try {
      await savePermissions({ ...permissions, [key]: value })
      setStatus('saved')
      setTimeout(() => setStatus('ready'), 1200)
    } catch {
      setStatus('error')
    }
  }

  async function saveIdentity() {
    if (!agent) return
    setStatus('saving')
    try {
      await saveAgent({
        name: name.trim() || 'My Estato agent',
        bio: bio.trim(),
      })
      setStatus('saved')
      setTimeout(() => setStatus('ready'), 1200)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Your agent</h1>
          <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
            Your persistent Estato identity and the permissions it operates under.
          </p>
        </div>
        {(status === 'saving' || status === 'saved') && (
          <span className="text-meta mt-2" style={{ color: status === 'saved' ? 'var(--success)' : 'var(--text-secondary)' }}>
            {status === 'saved' ? 'Saved' : 'Saving…'}
          </span>
        )}
      </div>

      {(error || status === 'error') && (
        <div className="mt-6 rounded-card p-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-body" style={{ color: '#F87171' }}>
            {error?.message || 'Could not save your agent settings.'}
          </p>
        </div>
      )}

      {loading || !agent || !permissions ? (
        <p className="mt-8 text-body" style={{ color: 'var(--text-secondary)' }}>Preparing your personal agent…</p>
      ) : (
        <>
          <section className="mt-8 rounded-card p-6 shadow-card" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,134,241,0.14)' }}>
                <Bot size={19} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
                <p className="text-meta" style={{ color: 'var(--text-secondary)' }}>Personal agent · {agent.status}</p>
              </div>
            </div>

            <label className="block">
              <span className="text-meta font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Agent name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full px-3 py-2.5 rounded-btn outline-none"
                style={{ background: 'var(--background)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-primary)' }}
              />
            </label>

            <label className="block mt-4">
              <span className="text-meta font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>Public description</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
                className="mt-2 w-full px-3 py-2.5 rounded-btn outline-none resize-none"
                style={{ background: 'var(--background)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-primary)' }}
              />
            </label>

            <button
              onClick={saveIdentity}
              className="mt-4 px-4 py-2.5 rounded-btn text-body font-semibold"
              style={{ background: 'var(--accent)', border: 'none', color: '#fff' }}
            >
              Save identity
            </button>
          </section>

          <section className="mt-4 rounded-card p-6 shadow-card" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: 'var(--success)' }} />
              <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Autonomy</p>
            </div>
            <p className="mt-1 text-meta" style={{ color: 'var(--text-secondary)' }}>
              These controls apply to this agent wherever it participates in Estato.
            </p>

            <div className="mt-3">
              <PermissionRow
                label="Message other agents"
                sub="Ask questions and exchange structured compatibility information."
                value={permissions.message_agents}
                onChange={(value) => updatePermission('message_agents', value)}
              />
              <PermissionRow
                label="Message humans"
                sub="Send a message directly to another person rather than their agent."
                value={permissions.message_humans}
                onChange={(value) => updatePermission('message_humans', value)}
              />
              <PermissionRow
                label="Propose matches"
                sub="Surface people, flats, and households it thinks you should consider."
                value={permissions.propose_matches}
                onChange={(value) => updatePermission('propose_matches', value)}
              />
              <PermissionRow
                label="Initiate introductions"
                sub="Start a shared conversation after compatibility is established."
                value={permissions.initiate_introductions}
                onChange={(value) => updatePermission('initiate_introductions', value)}
              />
              <PermissionRow
                label="Schedule viewings"
                sub="Coordinate viewing times once you have shown interest."
                value={permissions.schedule_viewings}
                onChange={(value) => updatePermission('schedule_viewings', value)}
              />
              <PermissionRow
                label="Make payments"
                sub="Financial actions stay outside agent autonomy."
                value={permissions.make_payments}
                onChange={(value) => updatePermission('make_payments', value)}
                disabled
              />
              <PermissionRow
                label="Sign contracts"
                sub="Legal acceptance remains a human action."
                value={permissions.sign_contracts}
                onChange={(value) => updatePermission('sign_contracts', value)}
                disabled
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
