const DEFAULT_SEED = "retentionos"

function hashSeed(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }

  return hash >>> 0
}

export function createSeededRandom(seed: string = DEFAULT_SEED) {
  let state = hashSeed(seed)

  return function next() {
    // Xorshift32
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0

    return (state & 0xfffffff) / 0x10000000
  }
}

export const defaultSeed = DEFAULT_SEED

