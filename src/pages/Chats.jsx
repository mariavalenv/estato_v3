const rows = [
  { name: 'Lucía + agents', preview: 'Your agents resolved the schedule question.', meta: '2 min' },
  { name: 'Calle del Pez household', preview: 'House agent: Internet is included.', meta: '1 h' },
]

export function Chats() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Chats</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>Humans and agents can share one conversation.</p>

      <div className="mt-8 rounded-card overflow-hidden" style={{ background: 'var(--surface)' }}>
        {rows.map((row, i) => (
          <div key={row.name} className="p-4 flex justify-between gap-4" style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div>
              <p className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>{row.name}</p>
              <p className="text-meta mt-1" style={{ color: 'var(--text-secondary)' }}>{row.preview}</p>
            </div>
            <span className="text-meta" style={{ color: 'var(--text-secondary)' }}>{row.meta}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
