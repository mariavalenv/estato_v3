// Small seeded random number generator (mulberry32), so every simulation
// run with the same seed produces the same invented world.

export function createRng(seed = 1) {
  let state = seed >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const rng = {
    next,
    chance: (p) => next() < p,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weights) => {
      const total = weights.reduce((sum, w) => sum + w, 0)
      let roll = next() * total
      for (let i = 0; i < items.length; i += 1) {
        roll -= weights[i]
        if (roll < 0) return items[i]
      }
      return items[items.length - 1]
    },
    sample: (items, count) => {
      const pool = [...items]
      const out = []
      while (out.length < count && pool.length > 0) {
        out.push(pool.splice(Math.floor(next() * pool.length), 1)[0])
      }
      return out
    },
    token: () => Math.floor(next() * 0xffffff).toString(16).padStart(6, '0'),
  }
  return rng
}
