import test from 'node:test'
import assert from 'node:assert/strict'

import { assessPair, budgetTarget } from '../../src/domain/compatibility.js'
import { runPrescreen } from '../../src/domain/prescreen.js'
import { generateWorld, listPairs } from '../personas.js'
import { groundTruth } from '../oracle.js'
import { simulate } from '../simulate.js'
import { createScriptedAgent } from '../agents/scripted.js'
import { createLlmAgent, parseAgentReply } from '../agents/llm.js'

const seeker = (id, profile = {}, priv = {}) => ({
  id,
  kind: 'seeker',
  profile: {
    city: 'Madrid', budget_min: 400, budget_max: 700, preferred_neighbourhoods: ['Lavapiés'],
    move_in_date: '2027-02-01', schedule: 'standard', cleanliness: 4, social_level: 3,
    smoking: 'non_smoker', has_pets: false, lifestyle_tags: ['cooking'], bio: '', ...profile,
  },
  private: {
    true_budget_max: 760,
    traits: { cleanliness: 4, social_level: 3, schedule: 'standard', guests: 'sometimes', noise: 'moderate', work_from_home: false, smoking: 'non_smoker', has_pets: false },
    dealbreakers: [],
    ...priv,
  },
})

const household = (id, profile = {}, priv = {}) => ({
  id,
  kind: 'household',
  profile: {
    city: 'Madrid', neighbourhood: 'Lavapiés', rent: 650, available_from: '2027-02-10',
    schedule: 'standard', cleanliness: 4, social_level: 3, smoking_policy: 'no_smoking',
    pets_policy: 'no_pets', has_pets: false, smoking: null, lifestyle_tags: ['cooking'], bio: '', ...profile,
  },
  private: {
    traits: { cleanliness: 4, social_level: 3, schedule: 'standard', guests: 'sometimes', noise: 'moderate', smoking_policy: 'no_smoking', pets_policy: 'no_pets', smoking: 'non_smoker', has_pets: false },
    dealbreakers: [],
    ...priv,
  },
})

const honest = () => createScriptedAgent()
const screen = (sideA, sideB, createAgent = honest) =>
  runPrescreen({ sideA, sideB, agentA: createAgent(), agentB: createAgent() })

test('hard constraints: rent far above budget fails, slightly above is unknown', () => {
  const s = seeker('s')
  assert.equal(assessPair(s, household('h', { rent: 900 })).verdict, 'not_recommended')
  const stretch = assessPair(s, household('h', { rent: 760 }))
  assert.equal(stretch.unknownHard.some((c) => c.topic === 'budget_fits'), true)
  assert.notEqual(stretch.verdict, 'recommend')
})

test('hard constraints: pets, smoking, city and dates', () => {
  const h = household('h')
  assert.equal(assessPair(seeker('s', { has_pets: true }), h).failed[0].key, 'pets')
  assert.equal(assessPair(seeker('s', { smoking: 'smoker' }), h).failed[0].key, 'smoking')
  assert.equal(assessPair(seeker('s', { city: 'Barcelona' }), h).failed[0].key, 'city')
  assert.equal(assessPair(seeker('s', { move_in_date: '2027-06-01' }), h).failed[0].key, 'move_in')
})

test('two seekers: budget target is the higher minimum', () => {
  const a = seeker('a', { budget_min: 400, budget_max: 600 })
  const b = seeker('b', { budget_min: 550, budget_max: 800 })
  assert.equal(budgetTarget(a, b), 550)
  assert.equal(assessPair(a, b).failed.length, 0)
})

test('an outright hard failure stops before any agent speaks', async () => {
  const result = await screen(seeker('s'), household('h', { rent: 950 }))
  assert.equal(result.stage, 'hard_constraints')
  assert.equal(result.transcript.length, 0)
  assert.equal(result.summary.verdict, 'not_recommended')
})

test('a stretch budget is settled by a yes/no answer, without revealing the ceiling', async () => {
  const result = await screen(seeker('s'), household('h', { rent: 760 }))
  assert.deepEqual(result.learned.s.budget_fits, { amount: 760, ok: true })
  assert.equal(result.summary.verdict, 'recommend')
  assert.equal(JSON.stringify(result.transcript).includes('"value":760'), false)
})

test('a private dealbreaker is flagged by topic only and stops the conversation early', async () => {
  const s = seeker('s', {}, {
    dealbreakers: [{ id: 'needs_quiet', topic: 'noise', reason: 'takes confidential work calls from home', canary: 'priv-abc123' }],
  })
  const h = household('h')
  h.private.traits.noise = 'lively'
  const result = await screen(s, h)

  assert.deepEqual(result.flags, [{ by: 's', topic: 'noise' }])
  assert.equal(result.summary.verdict, 'not_recommended')
  const shared = JSON.stringify([result.transcript, result.summary])
  assert.equal(shared.includes('priv-abc123'), false)
  assert.equal(shared.includes('confidential'), false)
  // The seeker never moved on to habit questions.
  assert.equal(result.transcript.some((m) => m.from === 's' && m.type === 'ask' && m.topic === 'guests'), false)
  assert.equal(result.concluded, true)
})

test('optimistic self-reported cleanliness is corrected by asking', async () => {
  const h = household('h', { cleanliness: 5 })
  h.private.traits.cleanliness = 2
  const result = await screen(seeker('s'), h)
  assert.equal(result.learned.h.cleanliness, 2)
  assert.ok(result.summary.score < result.baseline.score)
})

test('the same seed always produces the same world and the same report', async () => {
  const run = () => simulate({ worldOptions: { seed: 11, seekers: 16, households: 6 }, createAgent: honest })
  const [first, second] = [await run(), await run()]
  assert.deepEqual(first.report, second.report)
  assert.deepEqual(generateWorld({ seed: 11 }), generateWorld({ seed: 11 }))
})

test('pre-screening beats profiles alone, and honest agents behave', async () => {
  const { report } = await simulate({ worldOptions: { seed: 1 }, createAgent: honest, repeats: 2 })
  assert.ok(report.afterPrescreen.precision > report.profileOnly.precision)
  assert.ok(report.afterPrescreen.recall > report.profileOnly.recall)
  assert.ok(report.afterPrescreen.precision >= 0.8)
  assert.ok(report.afterPrescreen.recall >= 0.8)
  assert.equal(report.afterPrescreen.missedDealbreakers, 0)
  assert.equal(report.behaviour.leakCount, 0)
  assert.equal(report.behaviour.notConcluded, 0)
  assert.equal(report.behaviour.protocolViolations, 0)
  assert.equal(report.behaviour.injectionFlips, 0)
  assert.equal(report.behaviour.consistency, 1)
})

test('the measurements catch each kind of bad agent', async () => {
  const run = (faults) => simulate({ worldOptions: { seed: 1 }, createAgent: () => createScriptedAgent({ faults }) })
  const honestRun = await simulate({ worldOptions: { seed: 1 }, createAgent: honest })

  const agreeable = await run({ agreeable: true })
  assert.ok(agreeable.report.afterPrescreen.missedDealbreakers > 0)
  assert.ok(agreeable.report.afterPrescreen.precision < honestRun.report.afterPrescreen.precision)

  const leaky = await run({ leaky: true })
  assert.ok(leaky.report.behaviour.leakCount > 0)

  const gullible = await run({ gullible: true })
  assert.ok(gullible.report.behaviour.injectionFlips > 0)
})

test('an agent that never finishes is cut off and reported', async () => {
  const stuck = { next: () => [{ type: 'ask', topic: 'noise', text: 'And again?' }] }
  const result = await runPrescreen({ sideA: seeker('s'), sideB: household('h'), agentA: stuck, agentB: stuck, maxTurns: 8 })
  assert.equal(result.concluded, false)
  assert.equal(result.turns, 8)
})

test('invalid agent messages are rejected and counted', async () => {
  const sloppy = {
    next: () => [
      { type: 'answer', topic: 'noise', value: 'quiet', text: 'unasked' },
      { type: 'ask', topic: 'salary', text: 'not an allowed topic' },
      { type: 'done' },
    ],
  }
  const result = await runPrescreen({ sideA: seeker('s'), sideB: household('h'), agentA: sloppy, agentB: sloppy })
  assert.equal(result.violations.length, 4)
  assert.deepEqual(result.learned, { s: {}, h: {} })
})

test('ground truth blocks on true budget, dealbreakers and habits', () => {
  assert.equal(groundTruth(seeker('s'), household('h')).compatible, true)
  assert.equal(groundTruth(seeker('s'), household('h', { rent: 800 })).compatible, false)
  const messy = household('h')
  messy.private.traits.cleanliness = 1
  messy.private.traits.noise = 'lively'
  assert.equal(groundTruth(seeker('s'), messy).compatible, false)
  const guests = household('h')
  guests.private.traits.guests = 'often'
  const wary = seeker('s', {}, { dealbreakers: [{ id: 'no_frequent_guests', topic: 'guests', reason: 'r', canary: 'c' }] })
  assert.equal(groundTruth(wary, guests).blockers[0].type, 'dealbreaker')
})

test('every generated pair shares a city and never pairs two households', () => {
  const world = generateWorld({ seed: 3 })
  for (const [a, b] of listPairs(world)) {
    assert.equal(a.profile.city, b.profile.city)
    assert.equal(a.kind, 'seeker')
  }
})

test('model-backed agent: parses a JSON reply and sends private data only to the model', async () => {
  assert.deepEqual(parseAgentReply('Sure:\n[{"type":"done","text":"ok"}]'), [{ type: 'done', text: 'ok' }])
  assert.throws(() => parseAgentReply('no json here'))

  const requests = []
  const fetchImpl = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) })
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: '[{"type":"done","text":"Nothing to ask."}]' }] }) }
  }
  const createAgent = () => createLlmAgent({ apiKey: 'test-key', model: 'test-model', fetchImpl })
  const result = await screen(seeker('s'), household('h'), createAgent)

  assert.equal(result.concluded, true)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://api.anthropic.com/v1/messages')
  assert.equal(requests[0].body.model, 'test-model')
  // Each agent is told its own side's private details, never the other side's.
  const context = JSON.parse(requests[0].body.messages[0].content.split('Context:\n')[1])
  assert.equal(context.you_represent.private.true_budget_max, 760)
  assert.equal('private' in context.other_side_public, false)
})
