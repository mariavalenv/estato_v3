// Ground truth for the simulation.
//
// The oracle sees everything: how both sides actually live, true budget
// ceilings and every dealbreaker. It deliberately uses its own "friction"
// model instead of the engine's scoring formula, so the engine is not being
// marked against a copy of itself.
//
// Limit worth remembering: this truth is an assumption we wrote down. The
// simulation shows whether pre-screening recovers it from incomplete public
// profiles. Whether the assumption matches real flatmates can only be
// learned from real outcomes later.

import { MOVE_IN_WINDOW_DAYS, budgetTarget, daysBetween, GUEST_LEVELS, NOISE_LEVELS } from '../src/domain/compatibility.js'
import { isTriggered } from '../src/domain/dealbreakers.js'

export const FRICTION_LIMIT = 3
const FRICTION_SCALE = 8

const CLEANLINESS_FRICTION = [0, 0.5, 1.5, 3, 4]
const SOCIAL_FRICTION = [0, 0.3, 1, 2, 3]

function scheduleFriction(a, b) {
  if (a === b) return 0
  if (a === 'flexible' || b === 'flexible') return 0.3
  return [a, b].sort().join(':') === 'early:night' ? 2 : 0.7
}

function levelGap(a, b, levels) {
  return Math.abs(levels.indexOf(a) - levels.indexOf(b))
}

export function groundTruth(a, b) {
  const [s, o] = a.kind === 'household' ? [b, a] : [a, b]
  const st = s.private.traits
  const ot = o.private.traits
  const blockers = []

  if (s.profile.city !== o.profile.city) blockers.push({ type: 'hard', detail: 'different cities' })

  const amount = budgetTarget(a, b)
  for (const side of [s, o]) {
    if (side.kind !== 'seeker') continue
    if (amount > side.private.true_budget_max) blockers.push({ type: 'hard', detail: side.id + ' cannot afford it' })
  }

  const otherDate = o.kind === 'household' ? o.profile.available_from : o.profile.move_in_date
  if (Math.abs(daysBetween(s.profile.move_in_date, otherDate)) > MOVE_IN_WINDOW_DAYS) {
    blockers.push({ type: 'hard', detail: 'move-in dates too far apart' })
  }

  if (o.kind === 'household') {
    if (st.smoking === 'smoker' && ot.smoking_policy === 'no_smoking') blockers.push({ type: 'hard', detail: 'smoking not allowed' })
    if (st.has_pets && ot.pets_policy === 'no_pets') blockers.push({ type: 'hard', detail: 'pets not accepted' })
  }

  for (const [owner, other] of [[s, o], [o, s]]) {
    for (const dealbreaker of owner.private.dealbreakers) {
      if (isTriggered(dealbreaker.id, other.private.traits[dealbreaker.topic])) {
        blockers.push({ type: 'dealbreaker', by: owner.id, topic: dealbreaker.topic, detail: dealbreaker.id })
      }
    }
  }

  let friction = 0
  friction += CLEANLINESS_FRICTION[Math.abs(st.cleanliness - ot.cleanliness)]
  friction += SOCIAL_FRICTION[Math.abs(st.social_level - ot.social_level)]
  friction += scheduleFriction(st.schedule, ot.schedule)

  const noiseGap = levelGap(st.noise, ot.noise, NOISE_LEVELS)
  friction += [0, 0.5, 2][noiseGap]
  if ((st.work_from_home && ot.noise === 'lively') || (ot.work_from_home && st.noise === 'lively')) friction += 1

  friction += [0, 0.4, 1.5][levelGap(st.guests, ot.guests, GUEST_LEVELS)]

  if (o.kind === 'seeker') {
    const pair = [st.smoking, ot.smoking].sort().join(':')
    if (pair === 'non_smoker:smoker') friction += 1.5
    if (pair === 'non_smoker:outside_only') friction += 0.3
  } else {
    const prefs = s.profile.preferred_neighbourhoods
    if (prefs.length > 0 && !prefs.includes(o.profile.neighbourhood)) friction += 1
  }

  if (friction > FRICTION_LIMIT) blockers.push({ type: 'friction', detail: 'habits too far apart' })

  return {
    compatible: blockers.length === 0,
    truthScore: Math.round(100 * Math.max(0, 1 - friction / FRICTION_SCALE)),
    friction: Math.round(friction * 100) / 100,
    blockers,
  }
}
