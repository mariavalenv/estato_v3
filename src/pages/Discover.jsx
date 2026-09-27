import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDiscoverData } from '../hooks/useDiscoverData'
import { matchToCard, recordMatchAction } from '../lib/legacyData'
import {
  decideOnPerson,
  getMutualConversation,
  getOwnSocialDecisions,
  listDiscoverablePeople,
} from '../lib/v3People'
import { MatchCard } from '../components/ui/MatchCard'
import { RealPersonCard } from '../components/ui/RealPersonCard'

const FILTERS = [
  ['all', 'All'],
  ['people', 'People'],
  ['listing', 'Flats'],
  ['flatmate', 'Candidate profiles'],
]

export function Discover() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, setData, loading, error } = useDiscoverData(user?.id)
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [people, setPeople] = useState([])
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [peopleError, setPeopleError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function loadPeople() {
      setPeopleLoading(true)
      setPeopleError('')

      try {
        const [profiles, decisions] = await Promise.all([
          listDiscoverablePeople(user.id, {
            city: data.preferences?.city || undefined,
          }),
          getOwnSocialDecisions(user.id),
        ])

        if (cancelled) return

        const actionedUserIds = new Set(
          decisions
            .filter((decision) => decision.subject_type === 'user')
            .map((decision) => decision.subject_id)
        )

        setPeople(profiles.filter((profile) => !actionedUserIds.has(profile.user_id)))
      } catch (err) {
        if (!cancelled) setPeopleError(err.message)
      } finally {
        if (!cancelled) setPeopleLoading(false)
      }
    }

    loadPeople()
    return () => { cancelled = true }
  }, [user?.id, data.preferences?.city])

  const inventoryMatches = useMemo(() => {
    const all = [...data.listings, ...data.flatmates]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    if (filter === 'listing') return data.listings
    if (filter === 'flatmate') return data.flatmates
    return all
  }, [data, filter])

  async function decideInventory(match, action) {
    setBusyId(match.id)
    setNotice('')

    try {
      await recordMatchAction(user.id, match.id, action)
      setData((current) => ({
        ...current,
        listings: current.listings.filter((item) => item.id !== match.id),
        flatmates: current.flatmates.filter((item) => item.id !== match.id),
      }))
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function decidePerson(profile, decision) {
    setBusyId(profile.user_id)
    setNotice('')

    try {
      await decideOnPerson(user.id, profile.user_id, decision)
      setPeople((current) => current.filter((person) => person.user_id !== profile.user_id))

      if (decision === 'interested') {
        const conversation = await getMutualConversation(user.id, profile.user_id)

        if (conversation) {
          navigate('/chats?conversation=' + conversation.id)
          return
        }

        setNotice('Interest saved. If it is mutual, Estato will create a shared human + agent conversation automatically.')
      }
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const budgetText = data.preferences?.budget?.max
    ? ' · up to €' + data.preferences.budget.max.toLocaleString() + '/month'
    : ''

  const showPeople = filter === 'all' || filter === 'people'
  const showInventory = filter !== 'people'

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Discover</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
        Explore real Estato members alongside the existing housing and candidate inventory.
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

      {notice && (
        <div className="mt-6 rounded-card p-4" style={{ background: 'rgba(99,134,241,0.10)' }}>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>{notice}</p>
        </div>
      )}

      {(error || peopleError) && (
        <div className="mt-6 rounded-card p-5" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-body" style={{ color: '#F87171' }}>
            {error?.message || peopleError}
          </p>
        </div>
      )}

      {showPeople && (
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>People on Estato</h2>
              <p className="mt-1 text-meta" style={{ color: 'var(--text-secondary)' }}>
                Real signed-in members who explicitly made their flatmate profile discoverable.
              </p>
            </div>
            <span className="text-meta" style={{ color: 'var(--text-secondary)' }}>
              {people.length} available
            </span>
          </div>

          {peopleLoading ? (
            <p className="mt-5 text-body" style={{ color: 'var(--text-secondary)' }}>Looking for members…</p>
          ) : people.length === 0 ? (
            <div className="mt-5 rounded-card p-5" style={{ background: 'var(--surface)' }}>
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                No new discoverable members match this city yet. Your own profile stays private until you publish it in Account.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
              {people.map((profile) => (
                <RealPersonCard
                  key={profile.user_id}
                  profile={profile}
                  busy={busyId === profile.user_id}
                  onPass={() => decidePerson(profile, 'pass')}
                  onInterested={() => decidePerson(profile, 'interested')}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showInventory && (
        <section className="mt-10">
          <div>
            <h2 className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
              {filter === 'listing' ? 'Flats' : filter === 'flatmate' ? 'Candidate profiles' : 'Inventory'}
            </h2>
            <p className="mt-1 text-meta" style={{ color: 'var(--text-secondary)' }}>
              Existing Estato inventory enriched by the earlier matching agents.
            </p>
          </div>

          {loading ? (
            <p className="mt-5 text-body" style={{ color: 'var(--text-secondary)' }}>Loading inventory…</p>
          ) : inventoryMatches.length === 0 ? (
            <div className="mt-5 rounded-card p-6" style={{ background: 'var(--surface)' }}>
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                No unactioned inventory was returned for this filter.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
              {inventoryMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  {...matchToCard(match)}
                  busy={busyId === match.id}
                  onPass={() => decideInventory(match, 'rejected')}
                  onPrimary={() => decideInventory(match, 'approved')}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
