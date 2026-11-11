import { describe, expect, it } from 'vitest'
import { hash64 } from '../hash'
import { addHash, createSketch, estimate, REGISTER_COUNT } from '../hll'

async function sketchOf(count: number, prefix = 'visitor'): Promise<Uint8Array> {
  const registers = createSketch()
  const hashes = await Promise.all(Array.from({ length: count }, (_, i) => hash64(`${prefix}-${i}`)))
  for (const hash of hashes) addHash(registers, hash)
  return registers
}

describe('HyperLogLog', () => {
  it('uses 4096 one-byte registers', () => {
    expect(REGISTER_COUNT).toBe(4096)
    expect(createSketch().byteLength).toBe(4096)
  })

  it('estimates zero for an empty sketch', () => {
    expect(estimate(createSketch())).toBe(0)
  })

  it.each([1, 5, 50])('counts %i distinct inputs almost exactly', async (count) => {
    expect(Math.abs(estimate(await sketchOf(count)) - count)).toBeLessThan(Math.max(0.5, count * 0.02))
  })

  it.each([1_000, 10_000, 100_000])('estimates %i distinct inputs within 5%%', async (count) => {
    const result = estimate(await sketchOf(count))
    expect(Math.abs(result - count) / count).toBeLessThan(0.05)
  })

  it('ignores duplicates', async () => {
    const registers = await sketchOf(500)
    const before = estimate(registers)
    const again = await Promise.all(Array.from({ length: 500 }, (_, i) => hash64(`visitor-${i}`)))
    for (const hash of again) expect(addHash(registers, hash)).toBe(false)
    expect(estimate(registers)).toBe(before)
  })

  it('handles the extreme hash values', () => {
    const registers = createSketch()
    expect(addHash(registers, 0n)).toBe(true)
    expect(registers[0]).toBe(53)
    expect(addHash(registers, 0xffffffffffffffffn)).toBe(true)
    expect(registers[4095]).toBe(1)
  })
})
