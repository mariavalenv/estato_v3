import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../lib/supabase'
import { getPreferences, savePreferences } from '../lib/legacyData'
import { FlatmateProfileForm } from '../components/account/FlatmateProfileForm'

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-meta font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle = {
  background: 'var(--background)',
  border: '1px solid rgba(255,255,255,0.07)',
  color: 'var(--text-primary)',
}

export function Account() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    city: '',
    neighbourhoods: '',
    budgetMin: '',
    budgetMax: '',
    timeline: '',
    flatType: '',
    bedrooms: '1',
    commuteAnchor: '',
    commuteMaxMinutes: '45',
    dealBreakers: '',
  })

  useEffect(() => {
    getPreferences(user.id)
      .then((prefs) => {
        if (!prefs) return
        setForm({
          city: prefs.city || '',
          neighbourhoods: (prefs.neighbourhoods || []).join(', '),
          budgetMin: prefs.budget?.min ?? '',
          budgetMax: prefs.budget?.max ?? '',
          timeline: prefs.move_in_timeline || '',
          flatType: prefs.flat_type || '',
          bedrooms: String(prefs.bedrooms ?? 1),
          commuteAnchor: prefs.commute_anchor || '',
          commuteMaxMinutes: String(prefs.commute_max_minutes ?? 45),
          dealBreakers: (prefs.deal_breakers || []).join(', '),
        })
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false))
  }, [user.id])

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await savePreferences(user.id, {
        city: form.city.trim(),
        neighbourhoods: form.neighbourhoods.split(',').map((value) => value.trim()).filter(Boolean),
        budget: {
          min: form.budgetMin ? Number(form.budgetMin) : null,
          max: form.budgetMax ? Number(form.budgetMax) : null,
        },
        move_in_timeline: form.timeline.trim(),
        flat_type: form.flatType.trim(),
        bedrooms: form.bedrooms,
        commute_anchor: form.commuteAnchor.trim(),
        commute_max_minutes: form.commuteMaxMinutes ? Number(form.commuteMaxMinutes) : null,
        deal_breakers: form.dealBreakers.split(',').map((value) => value.trim()).filter(Boolean),
      })
      setMessage('Preferences saved.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await auth.signOut()
    navigate('/', { replace: true })
  }

  const messageIsSuccess = message === 'Preferences saved.'

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Account</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
        Your existing Supabase account and search preferences.
      </p>

      <section className="mt-8 rounded-card p-6" style={{ background: 'var(--surface)' }}>
        <p className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>
          {user.user_metadata?.full_name || 'Estato user'}
        </p>
        <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
        <button onClick={signOut} className="mt-4 text-meta font-semibold" style={{ background: 'none', border: 'none', color: '#F87171', padding: 0 }}>
          Sign out
        </button>
      </section>

      <form onSubmit={submit} className="mt-4 rounded-card p-6 flex flex-col gap-5" style={{ background: 'var(--surface)' }}>
        <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Search preferences</p>

        {loading ? (
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : (
          <>
            <Field label="City">
              <input value={form.city} onChange={(e) => update('city', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="Madrid" />
            </Field>

            <Field label="Neighbourhoods">
              <input value={form.neighbourhoods} onChange={(e) => update('neighbourhoods', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="Malasaña, Chamberí" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Budget min">
                <input type="number" value={form.budgetMin} onChange={(e) => update('budgetMin', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
              </Field>
              <Field label="Budget max">
                <input type="number" value={form.budgetMax} onChange={(e) => update('budgetMax', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Move-in timeline">
                <input value={form.timeline} onChange={(e) => update('timeline', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="1–3 months" />
              </Field>
              <Field label="Flat type">
                <input value={form.flatType} onChange={(e) => update('flatType', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="room / flat" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Bedrooms">
                <input type="number" min="0" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
              </Field>
              <Field label="Max commute minutes">
                <input type="number" min="5" value={form.commuteMaxMinutes} onChange={(e) => update('commuteMaxMinutes', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
              </Field>
            </div>

            <Field label="Commute destination">
              <input value={form.commuteAnchor} onChange={(e) => update('commuteAnchor', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="Office / university / area" />
            </Field>

            <Field label="Deal breakers">
              <input value={form.dealBreakers} onChange={(e) => update('dealBreakers', e.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="No lift, ground floor, noisy street" />
            </Field>

            {message && <p className="text-meta" style={{ color: messageIsSuccess ? 'var(--success)' : '#F87171' }}>{message}</p>}

            <button disabled={saving} className="py-3 rounded-btn font-semibold" style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: saving ? 0.65 : 1 }}>
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
          </>
        )}
      </form>

      <FlatmateProfileForm user={user} />
    </div>
  )
}
