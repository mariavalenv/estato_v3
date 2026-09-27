import { Briefcase, Home, Laptop, MapPin } from 'lucide-react'

export function RealPersonCard({ profile, busy, onPass, onInterested }) {
  const tags = [
    profile.schedule ? profile.schedule.replace('_', ' ') : null,
    profile.cleanliness ? 'cleanliness ' + profile.cleanliness + '/5' : null,
    profile.work_from_home ? 'works from home' : null,
    ...(profile.lifestyle_tags || []).slice(0, 3),
  ].filter(Boolean)

  const budget =
    profile.budget_min || profile.budget_max
      ? '€' + (profile.budget_min ?? '—') + '–€' + (profile.budget_max ?? '—')
      : null

  return (
    <article className="rounded-card overflow-hidden shadow-card" style={{ background: 'var(--surface)' }}>
      <div
        className="h-40 flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, rgba(52,211,153,0.18), rgba(99,134,241,0.12))' }}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: 'var(--background)', color: 'var(--text-primary)' }}>
            {profile.display_name?.slice(0, 1)?.toUpperCase() || 'P'}
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>{profile.display_name}</p>

        <div className="mt-2 flex flex-col gap-1 text-meta" style={{ color: 'var(--text-secondary)' }}>
          {profile.city && <span className="flex items-center gap-1.5"><MapPin size={12} /> {profile.city}</span>}
          {profile.occupation && <span className="flex items-center gap-1.5"><Briefcase size={12} /> {profile.occupation}</span>}
          {budget && <span className="flex items-center gap-1.5"><Home size={12} /> {budget} / month</span>}
          {profile.work_from_home && <span className="flex items-center gap-1.5"><Laptop size={12} /> Works from home</span>}
        </div>

        {profile.bio && (
          <p className="mt-4 text-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-chip text-meta" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 text-meta" style={{ color: 'var(--accent)' }}>
          ◆ Real Estato member · agent available
        </p>

        <div className="mt-5 flex gap-2">
          <button
            disabled={busy}
            onClick={onPass}
            className="flex-1 py-2.5 rounded-btn text-body font-medium"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', border: 'none', opacity: busy ? 0.6 : 1 }}
          >
            Pass
          </button>
          <button
            disabled={busy}
            onClick={onInterested}
            className="flex-1 py-2.5 rounded-btn text-body font-semibold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}
          >
            Interested
          </button>
        </div>
      </div>
    </article>
  )
}
