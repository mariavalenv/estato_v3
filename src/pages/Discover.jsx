import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDiscoverData } from '../hooks/useDiscoverData'
import { matchToCard, recordMatchAction } from '../lib/legacyData'
import { MatchCard } from '../components/ui/MatchCard'

const FILTERS = [
  ['all', 'All'],
  ['listing', 'Flats'],
  ['flatmate', 'Flatmates'],
]

export function Discover() {
  const { user } = useAuth()
  const { data, setData, loading, error } = useDiscoverData(user?.id)
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const matches = useMemo(() => {
    const all = [...data.listings, ...data.flatmates]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    if (filter === 'listing') return data.listings
    if (filter === 'flatmate') return data.flatmates
    return all
  }, [data, filter])

  async function decide(match, action) {
    setBusyId(match.id)
    try {
      await recordMatchAction(user.id, match.id, action)
      setData((current) => ({
        ...current,
        listings: current.listings.filter((item) => item.id !== match.id),
        flatmates: current.flatmates.filter((item) => item.id !== match.id),
      }))
    } finally {
      setBusyId(null)
    }
  }

  const budgetText = data.preferences?.budget?.max
    ? ' · up to €' + data.preferences.budget.max.toLocaleString() + '/month'
    : ''

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Discover</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
        Real inventory from your existing Estato Supabase data, ranked against your saved preferences.
      </p>

      {data.preferences?.city && (
        <p className="mt-3 text-meta" style={{ color: 'var(--text-secondary)' }}>
          Searching {data.preferences.city}{budgetText}
        </p>
      )}

      <div className="mt-6 flex gap-2 flex-wrap">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className="px-3 py-1.5 rounded-chip text-meta font-medium"
            style={{
              border: 'none',
              background: filter === value ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
              color: filter === value ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-card p-5" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-body" style={{ color: '#F87171' }}>Supabase returned an error: {error.message}</p>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-body" style={{ color: 'var(--text-secondary)' }}>Loading inventory…</p>
      ) : matches.length === 0 ? (
        <div className="mt-8 rounded-card p-6" style={{ background: 'var(--surface)' }}>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            No unactioned matches were returned. Try changing your preferences or filter.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              {...matchToCard(match)}
              busy={busyId === match.id}
              onPass={() => decide(match, 'rejected')}
              onPrimary={() => decide(match, 'approved')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
