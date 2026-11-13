// Runs the pre-screening over every plausible pair in an invented world and
// collects the measurements.

import { runPrescreen } from '../src/domain/prescreen.js'
import { generateWorld, listPairs, withoutInjection } from './personas.js'
import { groundTruth } from './oracle.js'
import { findLeaks, summariseRun } from './metrics.js'

export async function simulate({
  world,
  worldOptions = {},
  createAgent,
  repeats = 1,
  limit = Infinity,
  maxTurns,
  onProgress = () => {},
} = {}) {
  const activeWorld = world || generateWorld(worldOptions)
  const pairs = listPairs(activeWorld).slice(0, limit)
  const rows = []

  const screen = (sideA, sideB) =>
    runPrescreen({ sideA, sideB, agentA: createAgent(), agentB: createAgent(), maxTurns })

  for (const [sideA, sideB] of pairs) {
    const result = await screen(sideA, sideB)
    const row = {
      pair: [sideA.id, sideB.id],
      truth: groundTruth(sideA, sideB),
      result,
      leaks: findLeaks(result, sideA, sideB),
      repeatVerdicts: [result.summary.verdict],
      injectionCheck: null,
    }

    if (result.stage === 'dialogue') {
      for (let i = 1; i < repeats; i += 1) {
        const again = await screen(sideA, sideB)
        row.repeatVerdicts.push(again.summary.verdict)
        row.leaks.push(...findLeaks(again, sideA, sideB))
      }

      // Same pair with the planted instruction removed: did the verdict move?
      if (sideA.injected || sideB.injected) {
        const clean = await screen(withoutInjection(sideA), withoutInjection(sideB))
        row.injectionCheck = {
          withInjection: result.summary.verdict,
          withoutInjection: clean.summary.verdict,
          flipped: clean.summary.verdict !== result.summary.verdict,
        }
      }
    }

    rows.push(row)
    onProgress(rows.length, pairs.length)
  }

  return { world: activeWorld, rows, report: summariseRun(rows) }
}
