const rows = [
  ['Message other agents', 'Allowed'],
  ['Message humans', 'Ask first'],
  ['Propose matches', 'Allowed'],
  ['Initiate introductions', 'Ask first'],
  ['Schedule viewings', 'Ask first'],
  ['Sign contracts / pay', 'Never'],
]

export function Agent() {
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Your agent</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>Control what Estato may do for you.</p>

      <section className="mt-8 rounded-card p-6 shadow-card" style={{ background: 'var(--surface)' }}>
        <p className="text-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Permissions</p>
        <div className="mt-4 flex flex-col">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-body" style={{ color: 'var(--text-primary)' }}>{label}</span>
              <span className="text-meta" style={{ color: 'var(--accent)' }}>{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
