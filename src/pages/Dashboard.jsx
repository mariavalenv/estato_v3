import { CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MatchCard } from '../components/ui/MatchCard'

const samplePerson = {
  title: 'Lucía M.',
  subtitle: '27 · UX designer · Malasaña',
  reasons: ['Similar weekday schedule', 'Cleanliness preferences align', 'Looking in the same neighbourhoods'],
  discuss: ['Has a cat', 'Prefers quiet evenings'],
}

const sampleFlat = {
  title: 'Calle del Pez 14',
  subtitle: '€720 / month · Malasaña',
  reasons: ['Within budget', 'Desk space in bedroom', '18 min commute'],
  discuss: ['Top floor, no lift'],
}

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Good morning</h1>
        <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>Your agent is comparing people, flats, and households.</p>
      </div>

      <section className="rounded-card p-6 shadow-card relative overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="agent-orb w-5 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
            <div>
              <p className="text-meta font-medium" style={{ color: 'var(--text-secondary)' }}>Agent status</p>
              <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewing 14 options</p>
              <div className="mt-2 flex flex-col gap-1">
                <span className="flex items-center gap-2 text-body" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--success)' }} /> 2 strong matches identified
                </span>
                <span className="flex items-center gap-2 text-body" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--success)' }} /> 1 agent-to-agent conversation active
                </span>
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
          {['Asked a household agent about desk space', 'Compared 21 flatmate profiles', 'Saved 3 strong options'].map((item) => (
            <div key={item} className="flex items-center gap-3 text-body mb-3" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={14} /> {item}
            </div>
          ))}
        </section>

        <section className="rounded-card p-5 shadow-card" style={{ background: 'var(--surface)' }}>
          <p className="text-heading font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Needs your input</p>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>Lucía looks compatible</p>
              <p className="text-meta" style={{ color: 'var(--text-secondary)' }}>Your agents resolved the practical questions.</p>
            </div>
            <button onClick={() => navigate('/matches')} className="self-start px-3 py-1.5 rounded-btn text-meta font-medium" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
              Review
            </button>
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Strong matches</p>
          <button onClick={() => navigate('/matches')} className="flex items-center gap-1 text-body" style={{ background: 'none', border: 'none', color: 'var(--accent)' }}>
            View all <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <MatchCard type="person" {...samplePerson} />
          <MatchCard type="flat" {...sampleFlat} />
        </div>
      </section>
    </div>
  )
}
