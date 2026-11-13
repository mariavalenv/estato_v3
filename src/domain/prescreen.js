// Agent-to-agent pre-screening protocol.
//
// Order of work:
//   1. Code checks the hard constraints on the public profiles. An outright
//      failure stops here, before any agent speaks.
//   2. The two agents take turns. Each turn is a list of structured messages:
//        ask    { topic, amount? }   one question about the other side
//        answer { topic, value }     reply to a pending question
//        flag   { topic }            "this is a dealbreaker for my owner"
//        done   {}                   nothing more to ask
//      Agents may withhold an answer (value: null). They may never negotiate
//      money or commit their owner to anything.
//   3. Code recomputes the assessment with what was learned and writes the
//      joint summary. Agents do not set the verdict.

import { assessPair, summarise, GUEST_LEVELS, NOISE_LEVELS } from './compatibility.js'

export const TOPICS = {
  cleanliness: (v) => Number.isInteger(v) && v >= 1 && v <= 5,
  social_level: (v) => Number.isInteger(v) && v >= 1 && v <= 5,
  schedule: (v) => ['early', 'standard', 'night', 'flexible'].includes(v),
  work_from_home: (v) => typeof v === 'boolean',
  smoking: (v) => ['non_smoker', 'outside_only', 'smoker'].includes(v),
  has_pets: (v) => typeof v === 'boolean',
  guests: (v) => GUEST_LEVELS.includes(v),
  noise: (v) => NOISE_LEVELS.includes(v),
  smoking_policy: (v) => ['no_smoking', 'outside_only', 'allowed'].includes(v),
  pets_policy: (v) => ['no_pets', 'pets_ok'].includes(v),
  // The answer is yes/no for a specific amount. The ceiling itself is private.
  budget_fits: (v) => typeof v === 'boolean',
}

export const MESSAGE_TYPES = ['ask', 'answer', 'flag', 'done']
export const DEFAULT_MAX_TURNS = 24

function publicView(side) {
  return { id: side.id, kind: side.kind, profile: side.profile }
}

function validateMessage(message) {
  if (!message || !MESSAGE_TYPES.includes(message.type)) return 'unknown message type'
  if (message.type === 'done') return null
  if (!Object.hasOwn(TOPICS, message.topic)) return 'unknown topic'
  if (message.type === 'ask' && message.topic === 'budget_fits' && typeof message.amount !== 'number') {
    return 'budget question without an amount'
  }
  if (message.type === 'answer' && message.value !== null && !TOPICS[message.topic](message.value)) {
    return 'answer value is not valid for the topic'
  }
  return null
}

// sideA / sideB: { id, kind, profile, private }
// agentA / agentB: { next(view) -> message[] | Promise<message[]> }
export async function runPrescreen({ sideA, sideB, agentA, agentB, maxTurns = DEFAULT_MAX_TURNS }) {
  const publicA = publicView(sideA)
  const publicB = publicView(sideB)
  const baseline = assessPair(publicA, publicB)

  const result = {
    pair: [sideA.id, sideB.id],
    baseline: summarise(baseline),
    stage: 'hard_constraints',
    transcript: [],
    learned: { [sideA.id]: {}, [sideB.id]: {} },
    flags: [],
    violations: [],
    turns: 0,
    concluded: true,
  }

  if (baseline.failed.length > 0) {
    result.assessment = baseline
    result.summary = result.baseline
    return result
  }

  result.stage = 'dialogue'
  const seats = [
    { side: sideA, other: publicB, agent: agentA, done: false, memory: {} },
    { side: sideB, other: publicA, agent: agentB, done: false, memory: {} },
  ]
  // Questions waiting for an answer, keyed by the side that must answer.
  const pending = { [sideA.id]: [], [sideB.id]: [] }

  let seatIndex = 0
  while (result.turns < maxTurns) {
    const allDone = seats.every((seat) => seat.done && pending[seat.side.id].length === 0)
    if (allDone) break

    const seat = seats[seatIndex]
    seatIndex = 1 - seatIndex
    if (seat.done && pending[seat.side.id].length === 0) continue

    result.turns += 1
    const view = {
      self: seat.side,
      other: seat.other,
      transcript: result.transcript,
      learnedAboutOther: result.learned[seat.other.id],
      pendingAsks: [...pending[seat.side.id]],
      flags: result.flags,
      memory: seat.memory,
      done: seat.done,
    }

    let messages
    try {
      messages = await seat.agent.next(view)
    } catch (error) {
      result.violations.push({ by: seat.side.id, problem: 'agent error: ' + error.message })
      messages = [{ type: 'done' }]
    }
    if (!Array.isArray(messages)) {
      result.violations.push({ by: seat.side.id, problem: 'turn was not a list of messages' })
      messages = [{ type: 'done' }]
    }

    for (const raw of messages) {
      const problem = validateMessage(raw)
      if (problem) {
        result.violations.push({ by: seat.side.id, problem })
        continue
      }
      const message = {
        from: seat.side.id,
        type: raw.type,
        topic: raw.topic ?? null,
        value: raw.value ?? null,
        amount: raw.amount ?? null,
        text: typeof raw.text === 'string' ? raw.text : '',
      }

      if (message.type === 'ask') {
        if (seat.done) {
          result.violations.push({ by: seat.side.id, problem: 'asked after saying done' })
          continue
        }
        pending[seat.other.id].push({ topic: message.topic, amount: message.amount })
      } else if (message.type === 'answer') {
        const queue = pending[seat.side.id]
        const index = queue.findIndex((ask) => ask.topic === message.topic)
        if (index < 0) {
          result.violations.push({ by: seat.side.id, problem: 'answered a question nobody asked' })
          continue
        }
        const [ask] = queue.splice(index, 1)
        if (message.value !== null) {
          result.learned[seat.side.id][message.topic] = message.topic === 'budget_fits'
            ? { amount: ask.amount, ok: message.value }
            : message.value
        }
      } else if (message.type === 'flag') {
        const already = result.flags.some((f) => f.by === seat.side.id && f.topic === message.topic)
        if (!already) result.flags.push({ by: seat.side.id, topic: message.topic })
      } else if (message.type === 'done') {
        seat.done = true
      }
      result.transcript.push(message)
    }
  }

  const unanswered = pending[sideA.id].length + pending[sideB.id].length
  result.concluded = seats.every((seat) => seat.done) && unanswered === 0
  if (unanswered > 0) {
    result.violations.push({ by: 'both', problem: unanswered + ' question(s) left unanswered' })
  }

  const assessment = assessPair(publicA, publicB, { learned: result.learned, flags: result.flags })
  result.assessment = assessment
  result.summary = summarise(assessment)
  return result
}
