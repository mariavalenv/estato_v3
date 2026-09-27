import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAgentPermissions, saveAgentPermissions } from '../lib/legacyData'

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0"
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
        style={{
          background: '#fff',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

function Row({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function Agent() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    getAgentPermissions(user.id)
      .then((data) => {
        setPermissions(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [user.id])

  async function update(key, value) {
    if (!permissions) return
    const next = { ...permissions, [key]: value }
    setPermissions(next)
    setStatus('saving')

    try {
      const saved = await saveAgentPermissions(user.id, next)
      setPermissions(saved)
      setStatus('saved')
      setTimeout(() => setStatus('ready'), 1200)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Your agent</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
        These are the autonomy controls already stored in your existing Estato Supabase project.
      </p>

      {status === 'error' && (
        <p className="mt-5 text-body" style={{ color: '#F87171' }}>
          Could not load or save agent permissions.
        </p>
      )}

      {!permissions ? (
        <p className="mt-8 text-body" style={{ color: 'var(--text-secondary)' }}>Loading permissions…</p>
      ) : (
        <section className="mt-8 rounded-card p-6 shadow-card" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Permissions</p>
            {(status === 'saving' || status === 'saved') && (
              <span className="text-meta" style={{ color: status === 'saved' ? 'var(--success)' : 'var(--text-secondary)' }}>
                {status === 'saved' ? 'Saved' : 'Saving…'}
              </span>
            )}
          </div>

          <div className="mt-3">
            <Row label="Contact landlords autonomously" sub="Let the agent reach out without asking each time.">
              <Toggle
                checked={Boolean(permissions.can_contact_landlords)}
                onChange={(value) => update('can_contact_landlords', value)}
              />
            </Row>

            <Row label="Initiate flatmate introductions" sub="Let the agent start an introduction with a compatible person.">
              <Toggle
                checked={Boolean(permissions.can_initiate_introductions)}
                onChange={(value) => update('can_initiate_introductions', value)}
              />
            </Row>

            <Row
              label="Auto-reject threshold"
              sub={'Reject scores below ' + permissions.auto_reject_below_score}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={permissions.auto_reject_below_score}
                onChange={(event) => update('auto_reject_below_score', Number(event.target.value))}
                style={{ accentColor: 'var(--accent)', width: 120 }}
              />
            </Row>

            <Row
              label="Maximum commute"
              sub={permissions.max_commute_minutes + ' minutes'}
            >
              <input
                type="range"
                min="5"
                max="120"
                value={permissions.max_commute_minutes}
                onChange={(event) => update('max_commute_minutes', Number(event.target.value))}
                style={{ accentColor: 'var(--accent)', width: 120 }}
              />
            </Row>

            <Row label="Hard budget ceiling" sub="The agent should not consider options above this amount.">
              <input
                type="number"
                value={permissions.max_budget ?? ''}
                onChange={(event) => update('max_budget', event.target.value)}
                placeholder="No limit"
                className="w-32 px-3 py-2 rounded-btn outline-none"
                style={{ background: 'var(--background)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-primary)' }}
              />
            </Row>

            <Row label="Voice briefings" sub="Keep the existing voice briefing preference.">
              <Toggle
                checked={Boolean(permissions.voice_briefings_enabled)}
                onChange={(value) => update('voice_briefings_enabled', value)}
              />
            </Row>
          </div>

          <p className="mt-5 text-meta leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The v3-specific controls for agent-to-agent messaging, human messaging, introductions and household negotiation will live beside these once the additive v3 schema is applied.
          </p>
        </section>
      )}
    </div>
  )
}
