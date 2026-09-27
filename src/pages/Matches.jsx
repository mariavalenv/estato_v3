import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApprovedMatches, matchToCard, recordMatchAction } from '../lib/legacyData'
import { MatchCard } from '../components/ui/MatchCard'

export function Matches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    getApprovedMatches(user.id)
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user.id])

  async function removeMatch(matchId) {
    setBusyId(matchId)
    try {
      await recordMatchAction(user.id, matchId, 'rejected')
      setMatches((current) => current.filter((match) => match.id !== matchId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Matches</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
        Options you marked as interesting. These come from the existing Supabase action history.
      </p>

      {error && (
        <div className="mt-6 rounded-card p-5" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-body" style={{ color: '#F87171' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-body" style={{ color: 'var(--text-secondary)' }}>Loading matches…</p>
      ) : matches.length === 0 ? (
        <div className="mt-8 rounded-card p-6" style={{ background: 'var(--surface)' }}>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            You have not marked any current inventory as interesting yet.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              {...matchToCard(match)}
              busy={busyId === match.id}
              primaryLabel="Keep"
              onPass={() => removeMatch(match.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
