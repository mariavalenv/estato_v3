import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { getFlatmateProfile, saveFlatmateProfile } from '../../lib/v3People'

const inputStyle = {
  background: 'var(--background)',
  border: '1px solid rgba(255,255,255,0.07)',
  color: 'var(--text-primary)',
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-meta font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
      {hint && <span className="text-meta" style={{ color: 'var(--text-secondary)' }}>{hint}</span>}
    </label>
  )
}

export function FlatmateProfileForm({ user }) {
  const [form, setForm] = useState({
    display_name: '',
    city: '',
    occupation: '',
    bio: '',
    budget_min: '',
    budget_max: '',
    preferred_neighbourhoods: '',
    move_in_date: '',
    schedule: '',
    cleanliness: '',
    social_level: '',
    work_from_home: false,
    smoking: '',
    has_pets: false,
    pet_details: '',
    lifestyle_tags: '',
    is_discoverable: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getFlatmateProfile(user.id)
      .then((profile) => {
        if (!profile) return
        setForm({
          display_name: profile.display_name || '',
          city: profile.city || '',
          occupation: profile.occupation || '',
          bio: profile.bio || '',
          budget_min: profile.budget_min ?? '',
          budget_max: profile.budget_max ?? '',
          preferred_neighbourhoods: (profile.preferred_neighbourhoods || []).join(', '),
          move_in_date: profile.move_in_date || '',
          schedule: profile.schedule || '',
          cleanliness: profile.cleanliness ?? '',
          social_level: profile.social_level ?? '',
          work_from_home: Boolean(profile.work_from_home),
          smoking: profile.smoking || '',
          has_pets: Boolean(profile.has_pets),
          pet_details: profile.pet_details || '',
          lifestyle_tags: (profile.lifestyle_tags || []).join(', '),
          is_discoverable: Boolean(profile.is_discoverable),
        })
      })
      .catch((error) => setMessage(error.message))
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
      const saved = await saveFlatmateProfile(user.id, {
        ...form,
        preferred_neighbourhoods: form.preferred_neighbourhoods
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        lifestyle_tags: form.lifestyle_tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      })

      setForm((current) => ({ ...current, is_discoverable: saved.is_discoverable }))
      setMessage('Flatmate profile saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-card p-6 flex flex-col gap-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Flatmate profile</p>
          <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>
            This is separate from your private search preferences. Other signed-in people and their agents can only see it when you publish it.
          </p>
        </div>
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-chip text-meta"
          style={{
            background: form.is_discoverable ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.06)',
            color: form.is_discoverable ? 'var(--success)' : 'var(--text-secondary)',
          }}
        >
          {form.is_discoverable ? <Eye size={13} /> : <EyeOff size={13} />}
          {form.is_discoverable ? 'Discoverable' : 'Private'}
        </div>
      </div>

      {loading ? (
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Loading profile…</p>
      ) : (
        <>
          <Field label="Display name">
            <input value={form.display_name} onChange={(event) => update('display_name', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="City">
              <input value={form.city} onChange={(event) => update('city', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="Madrid" />
            </Field>
            <Field label="Occupation">
              <input value={form.occupation} onChange={(event) => update('occupation', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="Designer" />
            </Field>
          </div>

          <Field label="Bio">
            <textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} rows={3} className="px-3 py-2.5 rounded-btn outline-none resize-none" style={inputStyle} placeholder="A short intro for potential flatmates." />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Budget min">
              <input type="number" value={form.budget_min} onChange={(event) => update('budget_min', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
            </Field>
            <Field label="Budget max">
              <input type="number" value={form.budget_max} onChange={(event) => update('budget_max', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
            </Field>
          </div>

          <Field label="Preferred neighbourhoods">
            <input value={form.preferred_neighbourhoods} onChange={(event) => update('preferred_neighbourhoods', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="Malasaña, Chamberí" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Move-in date">
              <input type="date" value={form.move_in_date} onChange={(event) => update('move_in_date', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
            </Field>
            <Field label="Schedule">
              <select value={form.schedule} onChange={(event) => update('schedule', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle}>
                <option value="">Not specified</option>
                <option value="early">Early riser</option>
                <option value="standard">Standard</option>
                <option value="night">Night owl</option>
                <option value="flexible">Flexible</option>
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Cleanliness" hint="1 = relaxed, 5 = very tidy">
              <input type="number" min="1" max="5" value={form.cleanliness} onChange={(event) => update('cleanliness', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
            </Field>
            <Field label="Social level" hint="1 = quiet/homebody, 5 = very social">
              <input type="number" min="1" max="5" value={form.social_level} onChange={(event) => update('social_level', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Smoking">
              <select value={form.smoking} onChange={(event) => update('smoking', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle}>
                <option value="">Not specified</option>
                <option value="non_smoker">Non-smoker</option>
                <option value="outside_only">Outside only</option>
                <option value="smoker">Smoker</option>
                <option value="no_preference">No preference</option>
              </select>
            </Field>
            <Field label="Lifestyle tags">
              <input value={form.lifestyle_tags} onChange={(event) => update('lifestyle_tags', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="quiet evenings, active, cooking" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 text-body" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.work_from_home} onChange={(event) => update('work_from_home', event.target.checked)} />
              Work from home regularly
            </label>
            <label className="flex items-center gap-3 text-body" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.has_pets} onChange={(event) => update('has_pets', event.target.checked)} />
              I have pets
            </label>
          </div>

          {form.has_pets && (
            <Field label="Pet details">
              <input value={form.pet_details} onChange={(event) => update('pet_details', event.target.value)} className="px-3 py-2.5 rounded-btn outline-none" style={inputStyle} placeholder="One cat" />
            </Field>
          )}

          <label className="flex items-start gap-3 p-4 rounded-card" style={{ background: 'var(--background)' }}>
            <input
              type="checkbox"
              checked={form.is_discoverable}
              onChange={(event) => update('is_discoverable', event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-body font-medium" style={{ color: 'var(--text-primary)' }}>Let other Estato members discover me</span>
              <span className="block text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>
                Your published profile can be seen by signed-in people and their agents. Your private search preferences remain private.
              </span>
            </span>
          </label>

          {message && (
            <p className="text-meta" style={{ color: message === 'Flatmate profile saved.' ? 'var(--success)' : '#F87171' }}>{message}</p>
          )}

          <button disabled={saving} className="py-3 rounded-btn font-semibold" style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: saving ? 0.65 : 1 }}>
            {saving ? 'Saving…' : 'Save flatmate profile'}
          </button>
        </>
      )}
    </form>
  )
}
