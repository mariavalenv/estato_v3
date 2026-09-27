import { CheckCircle2, ChevronRight, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardData } from '../hooks/useDashboardData'
import { matchToCard, recordMatchAction } from '../lib/legacyData'
import { MatchCard } from '../components/ui/MatchCard'

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, error, refresh } = useDashboardData(user?.id)

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'

  async function decide(matchId, action) {
    await recordMatchAction(user.id, matchId, action)
    await refresh()
  }

  const status = data?.agentStatus
  const strongMatches = data?.strongMatches ?? []
  const recentActivity = data?.recentActivity ?? []
  const topMatch = strongMatches[0]

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>
          Good morning, {firstName}
        </h1>
        <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>
          Your agent is comparing people and flats against your preferences.
        </p>
      </div>

      {!data?.preferences && !loading && (
        <section className="rounded-card p-5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.16)' }}>
          <p className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>Add your search preferences</p>
          <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>
            Your existing inventory can be filtered much more accurately once Estato knows your city and budget.
          </p>
          <button onClick={() => navigate('/account')} className="mt-3 text-meta font-semibold" style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 0 }}>
            Set preferences
          </button>
        </section>
      )}

      {error && (
        <section className="rounded-card p-5" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <p className="text-body" style={{ color: '#F87171' }}>
            Supabase returned an error: {error.message}
          </p>
        </section>
      )}

      <section className="rounded-card p-6 shadow-card relative overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="agent-orb w-5 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
            <div>
              <p className="text-meta font-medium" style={{ color: 'var(--text-secondary)' }}>Agent status</p>
              <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
                {loading ? 'Checking your search…' : status?.current_task || 'Reviewing available options'}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <span className="flex items-center gap-2 text-body" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                  {strongMatches.length} strong options currently available
                </span>
                {status?.options_reviewed != null && (
                  <span className="flex items-center gap-2 text-body" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                    {status.options_reviewed} options reviewed
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/agent')} className="text-meta" style={{ background: 'none', border: 'none', color: 'var(--accent)' }}>
            Manage
          </button>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-card p-5 shadow-card" style={{ background: 'var(--surface)' }}>
          <p className="text-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent activity</p>
          {recentActivity.length === 0 && !loading ? (
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>No activity yet.</p>
          ) : (
            recentActivity.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-body mb-3" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={14} className="mt-1 shrink-0" />
                <div>
                  <p>{item.action}</p>
                  {item.detail && <p className="text-meta mt-0.5">{item.detail}</p>}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="rounded-card p-5 shadow-card" style={{ background: 'var(--surface)' }}>
          <p className="text-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Needs your input</p>
          {topMatch ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>
                  {matchToCard(topMatch).title}
                </p>
                <p className="text-meta" style={{ color: 'var(--text-secondary)' }}>
                  Your agent found this worth reviewing.
                </p>
              </div>
              <button onClick={() => navigate('/discover')} className="self-start px-3 py-1.5 rounded-btn text-meta font-medium" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                Review
              </button>
            </div>
          ) : (
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
              Nothing needs your attention right now.
            </p>
          )}
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Strong matches</p>
          <button onClick={() => navigate('/discover')} className="flex items-center gap-1 text-body" style={{ background: 'none', border: 'none', color: 'var(--accent)' }}>
            View all <ChevronRight size={15} />
          </button>
        </div>

        {strongMatches.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {strongMatches.slice(0, 4).map((match) => {
              const card = matchToCard(match)
              return (
                <MatchCard
                  key={match.id}
                  {...card}
                  onPass={() => decide(match.id, 'rejected')}
                  onPrimary={() => decide(match.id, 'approved')}
                />
              )
            })}
          </div>
        ) : (
          !loading && (
            <div className="rounded-card p-6" style={{ background: 'var(--surface)' }}>
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                No matching inventory was returned for your current preferences.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  )
}
