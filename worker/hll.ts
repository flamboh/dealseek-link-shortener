export const PRECISION = 12
export const REGISTER_COUNT = 1 << PRECISION

const HIGH_REST_BITS = 32 - PRECISION
const HIGH_REST_MASK = (1 << HIGH_REST_BITS) - 1
const ALPHA = 0.7213 / (1 + 1.079 / REGISTER_COUNT)

export function createSketch(): Uint8Array<ArrayBuffer> {
  return new Uint8Array(REGISTER_COUNT)
}

export function addHash(registers: Uint8Array, hash: bigint): boolean {
  const hi = Number(BigInt.asUintN(64, hash) >> 32n)
  const lo = Number(hash & 0xffffffffn)
  const index = hi >>> HIGH_REST_BITS
  const restHi = hi & HIGH_REST_MASK
  const rank =
    restHi !== 0
      ? Math.clz32(restHi) - PRECISION + 1
      : lo !== 0
        ? HIGH_REST_BITS + Math.clz32(lo) + 1
        : HIGH_REST_BITS + 33
  if (rank <= registers[index]) return false
  registers[index] = rank
  return true
}

export function estimate(registers: Uint8Array): number {
  const m = registers.length
  let sum = 0
  let zeros = 0
  for (const register of registers) {
    sum += 2 ** -register
    if (register === 0) zeros++
  }
  const raw = (ALPHA * m * m) / sum
  if (raw <= 2.5 * m && zeros > 0) return m * Math.log(m / zeros)
  return raw
}
