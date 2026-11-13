// Dealbreaker catalogue. A dealbreaker belongs to one side and is private:
// the other side only ever learns its topic (through a flag), never the
// reason behind it.

export const DEALBREAKERS = {
  no_pets: {
    topic: 'has_pets',
    triggered: (value) => value === true,
    conflictsWithSelf: (traits) => traits.has_pets === true,
  },
  no_smokers: {
    topic: 'smoking',
    triggered: (value) => value === 'smoker',
    conflictsWithSelf: (traits) => traits.smoking === 'smoker',
  },
  no_night_schedule: {
    topic: 'schedule',
    triggered: (value) => value === 'night',
    conflictsWithSelf: (traits) => traits.schedule === 'night',
  },
  no_frequent_guests: {
    topic: 'guests',
    triggered: (value) => value === 'often',
    conflictsWithSelf: (traits) => traits.guests === 'often',
  },
  needs_quiet: {
    topic: 'noise',
    triggered: (value) => value === 'lively',
    conflictsWithSelf: (traits) => traits.noise === 'lively',
  },
  min_cleanliness: {
    topic: 'cleanliness',
    triggered: (value) => typeof value === 'number' && value <= 2,
    conflictsWithSelf: (traits) => traits.cleanliness <= 2,
  },
}

// Self-reports on these topics are known to be optimistic, so an agent
// should ask rather than trust the public profile.
export const UNRELIABLE_SELF_REPORTS = new Set(['cleanliness'])

export function isTriggered(dealbreakerId, value) {
  const spec = DEALBREAKERS[dealbreakerId]
  if (!spec) throw new Error('Unknown dealbreaker: ' + dealbreakerId)
  if (value === null || value === undefined) return false
  return spec.triggered(value)
}
