import { CheckCircle2, AlertCircle } from 'lucide-react'

export function MatchCard({ type = 'person', title, subtitle, reasons = [], discuss = [], onPrimary }) {
  return (
    <article className="rounded-card overflow-hidden shadow-card" style={{ background: 'var(--surface)' }}>
      <div
        className="h-40 flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, rgba(99,134,241,0.22), rgba(255,255,255,0.03))' }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: 'var(--background)', color: 'var(--text-primary)' }}>
          {type === 'person' ? '👤' : '⌂'}
        </div>
      </div>

      <div className="p-5">
        <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>

        <div className="mt-5">
          <p className="text-body font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your agent noticed</p>
          <div className="flex flex-col gap-2">
            {reasons.map((reason) => (
              <div key={reason} className="flex items-start gap-2 text-body">
                <CheckCircle2 size={14} className="mt-1 shrink-0" style={{ color: 'var(--success)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {discuss.length > 0 && (
          <div className="mt-4">
            <p className="text-body font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Worth discussing</p>
            <div className="flex flex-col gap-2">
              {discuss.map((item) => (
                <div key={item} className="flex items-start gap-2 text-body">
                  <AlertCircle size={14} className="mt-1 shrink-0" style={{ color: 'var(--warning)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button className="flex-1 py-2.5 rounded-btn text-body font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', border: 'none' }}>
            Pass
          </button>
          <button onClick={onPrimary} className="flex-1 py-2.5 rounded-btn text-body font-semibold" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
            Interested
          </button>
        </div>
      </div>
    </article>
  )
}
