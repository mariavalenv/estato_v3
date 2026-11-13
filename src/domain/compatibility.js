// Deterministic compatibility engine.
//
// Plain code decides hard constraints and the fit score, so the result is
// repeatable and testable. Agents only add facts (answers) and dealbreaker
// flags; they never set the score or the verdict themselves.
//
// A "side" is { id, kind: 'seeker' | 'household', profile }.
// Seeker profiles follow v3_flatmate_profiles. Household profiles use:
//   city, neighbourhood, rent, available_from, schedule, cleanliness,
//   social_level, smoking_policy, pets_policy, lifestyle_tags.

export const MOVE_IN_WINDOW_DAYS = 45
export const BUDGET_STRETCH = 0.15
export const THRESHOLDS = { recommend: 72, maybe: 55, minCoverage: 0.6 }

const LEVEL_SIMILARITY_5 = [1, 0.8, 0.45, 0.15, 0]
const SOCIAL_SIMILARITY_5 = [1, 0.85, 0.55, 0.25, 0]
const LEVEL_SIMILARITY_3 = [1, 0.7, 0.1]

export const GUEST_LEVELS = ['rarely', 'sometimes', 'often']
export const NOISE_LEVELS = ['quiet', 'moderate', 'lively']

const WEIGHTS = {
  cleanliness: 3,
  social_level: 2,
  schedule: 2,
  noise: 2,
  guests: 1.5,
  location: 1.5,
  budget: 1,
  smoking: 1,
  lifestyle_tags: 0.5,
}

function known(value) {
  return value !== null && value !== undefined && value !== '' && value !== 'no_preference'
}

export function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

export function scheduleSimilarity(a, b) {
  if (!known(a) || !known(b)) return null
  if (a === b) return 1
  if (a === 'flexible' || b === 'flexible') return 0.85
  const pair = [a, b].sort().join(':')
  if (pair === 'early:night') return 0.1
  return 0.6
}

function levelSimilarity(a, b, table) {
  if (!known(a) || !known(b)) return null
  return table[Math.min(Math.abs(a - b), table.length - 1)]
}

function namedLevelSimilarity(a, b, levels) {
  if (!known(a) || !known(b)) return null
  const ia = levels.indexOf(a)
  const ib = levels.indexOf(b)
  if (ia < 0 || ib < 0) return null
  return LEVEL_SIMILARITY_3[Math.abs(ia - ib)]
}

function jaccard(a, b) {
  const sa = new Set(a || [])
  const sb = new Set(b || [])
  if (sa.size === 0 || sb.size === 0) return null
  let shared = 0
  for (const item of sa) if (sb.has(item)) shared += 1
  return shared / (sa.size + sb.size - shared)
}

// Facts = public profile overlaid with what the other agent has learned.
// Learned answers win, because an agent's answer is expected to be more
// accurate than a self-reported profile field.
export function mergeFacts(side, learned = {}) {
  const facts = { ...side.profile }
  for (const [topic, value] of Object.entries(learned)) {
    if (value !== null && value !== undefined) facts[topic] = value
  }
  return facts
}

function orderPair(a, b) {
  if (a.kind === 'household' && b.kind === 'household') {
    throw new Error('Household-to-household pairs are not supported')
  }
  if (a.kind === 'household') return [b, a]
  return [a, b]
}

// The monthly amount each seeker in the pair must be able to afford.
export function budgetTarget(a, b) {
  const [first, second] = orderPair(a, b)
  if (second.kind === 'household') return second.profile.rent ?? null
  const mins = [first.profile.budget_min, second.profile.budget_min].filter(known)
  if (mins.length === 0) return null
  return Math.max(...mins)
}

function budgetCheck(side, facts, amount) {
  const key = 'budget:' + side.id
  if (!known(amount) || !known(facts.budget_max)) {
    return { key, topic: 'budget_fits', side: side.id, status: 'unknown', detail: 'Budget information is missing' }
  }
  const answer = facts.budget_fits
  if (answer && answer.amount === amount) {
    return {
      key, topic: 'budget_fits', side: side.id,
      status: answer.ok ? 'pass' : 'fail',
      detail: answer.ok ? 'Confirmed the amount works' : 'Confirmed the amount does not work',
    }
  }
  if (amount <= facts.budget_max) {
    return { key, topic: 'budget_fits', side: side.id, status: 'pass', detail: 'Within stated budget' }
  }
  if (amount <= facts.budget_max * (1 + BUDGET_STRETCH)) {
    return { key, topic: 'budget_fits', side: side.id, status: 'unknown', detail: 'Slightly above stated budget' }
  }
  return { key, topic: 'budget_fits', side: side.id, status: 'fail', detail: 'Well above stated budget' }
}

export function hardConstraints(a, b, { learned = {}, flags = [] } = {}) {
  const [s, o] = orderPair(a, b)
  const sf = mergeFacts(s, learned[s.id])
  const of = mergeFacts(o, learned[o.id])
  const checks = []

  if (!known(sf.city) || !known(of.city)) {
    checks.push({ key: 'city', status: 'unknown', detail: 'City is missing' })
  } else {
    checks.push({
      key: 'city',
      status: sf.city === of.city ? 'pass' : 'fail',
      detail: sf.city === of.city ? 'Same city' : 'Different cities',
    })
  }

  const amount = budgetTarget(a, b)
  checks.push(budgetCheck(s, sf, amount))
  if (o.kind === 'seeker') checks.push(budgetCheck(o, of, amount))

  const dateA = sf.move_in_date
  const dateB = o.kind === 'household' ? of.available_from : of.move_in_date
  if (!known(dateA) || !known(dateB)) {
    checks.push({ key: 'move_in', status: 'unknown', detail: 'A move-in date is missing' })
  } else {
    const gap = Math.abs(daysBetween(dateA, dateB))
    checks.push({
      key: 'move_in',
      status: gap <= MOVE_IN_WINDOW_DAYS ? 'pass' : 'fail',
      detail: gap + ' days apart',
    })
  }

  if (o.kind === 'household') {
    const smoker = sf.smoking
    const policy = of.smoking_policy
    if (policy === 'no_smoking' && smoker === 'smoker') {
      checks.push({ key: 'smoking', status: 'fail', detail: 'Seeker smokes; household does not allow smoking' })
    } else if (policy === 'no_smoking' && !known(smoker)) {
      checks.push({ key: 'smoking', topic: 'smoking', side: s.id, status: 'unknown', detail: 'Household does not allow smoking; seeker has not said' })
    } else if (smoker === 'smoker' && !known(policy)) {
      checks.push({ key: 'smoking', topic: 'smoking_policy', side: o.id, status: 'unknown', detail: 'Seeker smokes; household policy is not stated' })
    } else {
      checks.push({ key: 'smoking', status: 'pass', detail: 'No smoking conflict' })
    }

    const pets = sf.has_pets
    const petsPolicy = of.pets_policy
    if (petsPolicy === 'no_pets' && pets === true) {
      checks.push({ key: 'pets', status: 'fail', detail: 'Seeker has a pet; household does not accept pets' })
    } else if (petsPolicy === 'no_pets' && !known(pets)) {
      checks.push({ key: 'pets', topic: 'has_pets', side: s.id, status: 'unknown', detail: 'Household does not accept pets; seeker has not said' })
    } else if (pets === true && !known(petsPolicy)) {
      checks.push({ key: 'pets', topic: 'pets_policy', side: o.id, status: 'unknown', detail: 'Seeker has a pet; household policy is not stated' })
    } else {
      checks.push({ key: 'pets', status: 'pass', detail: 'No pet conflict' })
    }
  }

  for (const flag of flags) {
    checks.push({
      key: 'dealbreaker:' + flag.by + ':' + flag.topic,
      status: 'fail',
      flaggedBy: flag.by,
      topic: flag.topic,
      detail: 'Dealbreaker flagged on ' + flag.topic,
    })
  }

  return checks
}

export function softComponents(a, b, { learned = {} } = {}) {
  const [s, o] = orderPair(a, b)
  const sf = mergeFacts(s, learned[s.id])
  const of = mergeFacts(o, learned[o.id])
  const components = []
  const add = (key, similarity) => components.push({ key, weight: WEIGHTS[key], similarity })

  add('cleanliness', levelSimilarity(sf.cleanliness, of.cleanliness, LEVEL_SIMILARITY_5))
  add('social_level', levelSimilarity(sf.social_level, of.social_level, SOCIAL_SIMILARITY_5))
  add('schedule', scheduleSimilarity(sf.schedule, of.schedule))
  add('noise', namedLevelSimilarity(sf.noise, of.noise, NOISE_LEVELS))
  add('guests', namedLevelSimilarity(sf.guests, of.guests, GUEST_LEVELS))

  if (o.kind === 'household') {
    const prefs = sf.preferred_neighbourhoods || []
    add('location', prefs.length === 0 || !known(of.neighbourhood)
      ? null
      : prefs.includes(of.neighbourhood) ? 1 : 0.3)
    add('budget', !known(of.rent) || !known(sf.budget_max)
      ? null
      : of.rent <= sf.budget_max ? 1 : 0.5)
  } else {
    const overlap = jaccard(sf.preferred_neighbourhoods, of.preferred_neighbourhoods)
    add('location', overlap === null ? null : overlap > 0 ? 0.5 + 0.5 * overlap : 0.2)
    const ranges = [sf, of].every((f) => known(f.budget_min) && known(f.budget_max))
    if (!ranges) {
      add('budget', null)
    } else {
      const low = Math.max(sf.budget_min, of.budget_min)
      const high = Math.min(sf.budget_max, of.budget_max)
      add('budget', high >= low ? 1 : 0.5)
    }
    if (!known(sf.smoking) || !known(of.smoking)) {
      add('smoking', null)
    } else {
      const pair = [sf.smoking, of.smoking].sort().join(':')
      add('smoking', pair === 'non_smoker:smoker' ? 0.2 : pair === 'non_smoker:outside_only' ? 0.8 : 1)
    }
  }

  add('lifestyle_tags', jaccard(sf.lifestyle_tags, of.lifestyle_tags))
  return components
}

export function assessPair(a, b, context = {}) {
  const checks = hardConstraints(a, b, context)
  const components = softComponents(a, b, context)

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0)
  const knownComponents = components.filter((c) => c.similarity !== null)
  const knownWeight = knownComponents.reduce((sum, c) => sum + c.weight, 0)
  const score = knownWeight === 0
    ? 0
    : Math.round((knownComponents.reduce((sum, c) => sum + c.weight * c.similarity, 0) / knownWeight) * 100)
  const coverage = totalWeight === 0 ? 0 : knownWeight / totalWeight

  const failed = checks.filter((c) => c.status === 'fail')
  const unknownHard = checks.filter((c) => c.status === 'unknown')

  let verdict
  if (failed.length > 0) verdict = 'not_recommended'
  else if (score >= THRESHOLDS.recommend && coverage >= THRESHOLDS.minCoverage && unknownHard.length === 0) verdict = 'recommend'
  else if (score >= THRESHOLDS.maybe) verdict = 'maybe'
  else verdict = 'not_recommended'

  return { verdict, score, coverage: Math.round(coverage * 100) / 100, checks, components, failed, unknownHard }
}

const COMPONENT_LABELS = {
  cleanliness: 'cleanliness standards',
  social_level: 'how social they are at home',
  schedule: 'daily schedule',
  noise: 'noise levels',
  guests: 'how often guests come over',
  location: 'neighbourhood',
  budget: 'budget',
  smoking: 'smoking habits',
  lifestyle_tags: 'shared interests',
}

// Human-readable joint summary: what fits, where the friction is, and what
// is still unknown. It never includes a dealbreaker's reason, only its topic.
export function summarise(assessment) {
  const fits = []
  const frictions = []
  const unknowns = []

  for (const c of assessment.components) {
    const label = COMPONENT_LABELS[c.key] || c.key
    if (c.similarity === null) unknowns.push('Not enough information on ' + label)
    else if (c.similarity >= 0.8) fits.push('Good fit on ' + label)
    else if (c.similarity <= 0.45) frictions.push('Likely friction on ' + label)
  }
  for (const c of assessment.checks) {
    if (c.status === 'fail') frictions.push(c.detail)
    if (c.status === 'unknown') unknowns.push(c.detail)
  }

  return {
    verdict: assessment.verdict,
    score: assessment.score,
    coverage: assessment.coverage,
    fits,
    frictions,
    unknowns,
  }
}
