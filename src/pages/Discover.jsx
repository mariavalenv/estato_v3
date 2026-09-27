import { MatchCard } from '../components/ui/MatchCard'

export function Discover() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-display font-semibold" style={{ color: 'var(--text-primary)' }}>Discover</h1>
      <p className="mt-1 text-body" style={{ color: 'var(--text-secondary)' }}>People, flats, and households your agent thinks are worth your attention.</p>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
        <MatchCard type="person" title="Alex R." subtitle="29 · Product designer · Chamberí" reasons={['Overlapping budget', 'Similar schedule', 'Non-smoking household']} discuss={['Often hosts friends on weekends']} />
        <MatchCard type="flat" title="Calle Fuencarral 82" subtitle="€780 / month · Chamberí" reasons={['Within budget', 'Furnished', 'Near metro']} discuss={['Bills not included']} />
        <MatchCard type="person" title="Inés P." subtitle="26 · Architect · Centro" reasons={['Quiet evenings', 'Early riser', 'Similar move-in date']} discuss={['Dog visits occasionally']} />
      </div>
    </div>
  )
}
