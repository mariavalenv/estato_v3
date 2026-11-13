#!/usr/bin/env node
// Command-line entry point for the pre-screening simulator.
//
//   node sim/run.js                          rule-following agents, seed 1
//   node sim/run.js --seed 7 --seekers 60    a different, larger world
//   node sim/run.js --agent leaky            a deliberately broken agent
//   node sim/run.js --agent llm --limit 20 --repeats 3
//   node sim/run.js --show 2                 print two sample conversations
//   node sim/run.js --json sim/out/run.json  save the full results

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { simulate } from './simulate.js'
import { createScriptedAgent } from './agents/scripted.js'
import { createLlmAgent } from './agents/llm.js'

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    seekers: { type: 'string', default: '40' },
    households: { type: 'string', default: '15' },
    agent: { type: 'string', default: 'scripted' },
    repeats: { type: 'string', default: '1' },
    limit: { type: 'string' },
    show: { type: 'string', default: '0' },
    json: { type: 'string' },
  },
})

const AGENTS = {
  scripted: () => createScriptedAgent(),
  agreeable: () => createScriptedAgent({ faults: { agreeable: true } }),
  leaky: () => createScriptedAgent({ faults: { leaky: true } }),
  gullible: () => createScriptedAgent({ faults: { gullible: true } }),
  llm: () => createLlmAgent(),
}

const createAgent = AGENTS[values.agent]
if (!createAgent) {
  console.error('Unknown agent "' + values.agent + '". Choose one of: ' + Object.keys(AGENTS).join(', '))
  process.exit(1)
}

const percent = (value) => (value === null ? 'n/a' : (value * 100).toFixed(1) + '%')
const number = (value) => (value === null ? 'n/a' : value.toFixed(2))

function printQuality(title, quality) {
  console.log('\n' + title)
  console.log('  Recommended pairs that are truly compatible:  ' + percent(quality.precision))
  console.log('  Truly compatible pairs that got recommended:  ' + percent(quality.recall))
  console.log('  Truly compatible pairs rejected outright:     ' + quality.wronglyRejected)
  console.log('  Recommended despite a real dealbreaker:       ' + quality.missedDealbreakers)
  console.log('  Score agreement with ground truth (-1 to 1):  ' + number(quality.scoreAgreement))
  console.log('  Verdict            compatible  incompatible')
  for (const verdict of ['recommend', 'maybe', 'not_recommended']) {
    const row = quality.table[verdict]
    console.log('  ' + verdict.padEnd(18) + String(row.compatible).padStart(10) + String(row.incompatible).padStart(14))
  }
}

const started = Date.now()
const { rows, report } = await simulate({
  worldOptions: {
    seed: Number(values.seed),
    seekers: Number(values.seekers),
    households: Number(values.households),
  },
  createAgent,
  repeats: Number(values.repeats),
  limit: values.limit ? Number(values.limit) : Infinity,
  onProgress: (done, total) => {
    if (values.agent === 'llm') process.stderr.write('\r  screened ' + done + ' of ' + total + ' pairs')
  },
})
if (values.agent === 'llm') process.stderr.write('\n')

console.log('Estato pre-screening simulation')
console.log('  Agent: ' + values.agent + '   Seed: ' + values.seed + '   Repeats: ' + values.repeats)
console.log('  Pairs screened:                 ' + report.pairs)
console.log('  Truly compatible:               ' + report.trulyCompatible)
console.log('  Stopped at hard constraints:    ' + report.stoppedAtHardConstraints)
console.log('  Went to agent conversation:     ' + report.dialogues)

printQuality('Profiles only (no agent conversation)', report.profileOnly)
printQuality('After agent pre-screening', report.afterPrescreen)

const b = report.behaviour
console.log('\nAgent behaviour')
console.log('  Pairs with a private detail leaked:   ' + b.pairsWithLeaks + ' (' + b.leakCount + ' leaks)')
console.log('  Conversations that never concluded:   ' + b.notConcluded)
console.log('  Protocol violations:                  ' + b.protocolViolations)
console.log('  Turns per conversation (avg / max):   ' + (b.averageTurns ?? 'n/a') + ' / ' + (b.maxTurns ?? 'n/a'))
console.log('  Same verdict on repeated runs:        ' + (b.consistency === null ? 'n/a (use --repeats 3)' : percent(b.consistency)))
console.log('  Verdicts changed by planted bio text: ' + b.injectionFlips + ' of ' + b.injectionPairs + ' affected pairs')

const samples = rows.filter((row) => row.result.stage === 'dialogue').slice(0, Number(values.show))
for (const row of samples) {
  console.log('\n--- ' + row.pair.join(' and ') + ' ---')
  for (const message of row.result.transcript) {
    console.log('  [' + message.from + '] ' + message.type + (message.topic ? ' ' + message.topic : '') + ': ' + message.text)
  }
  console.log('  Summary: ' + JSON.stringify(row.result.summary))
  console.log('  Truth:   ' + JSON.stringify(row.truth))
}

if (values.json) {
  mkdirSync(dirname(values.json), { recursive: true })
  writeFileSync(values.json, JSON.stringify({ report, rows }, null, 2))
  console.log('\nFull results written to ' + values.json)
}
console.log('\nFinished in ' + ((Date.now() - started) / 1000).toFixed(1) + 's')
