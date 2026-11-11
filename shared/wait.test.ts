import { describe, expect, it } from 'vitest'
import { formatWait, tooManyLinksMessage } from './wait'

describe('formatWait', () => {
  it.each([
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [61, '2 minutes'],
    [240, '4 minutes'],
    [64 * 60, '64 minutes'],
    [90 * 60, '2 hours'],
    [24 * 60 * 60, '24 hours'],
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatWait(seconds)).toBe(text)
  })

  it('builds the full message', () => {
    expect(tooManyLinksMessage(240)).toBe("You're making links too quickly. Try again in 4 minutes.")
  })
})
