import { describe, expect, it } from 'vitest'
import { formatLength } from './units.ts'

describe('formatLength', () => {
  it.each([
    [6, '6"'],
    [12, "1'"],
    [80, '6\' 8"'],
    [143.6, "12'"],
  ])('imperial %d -> %s', (inches, expected) => {
    expect(formatLength(inches, 'imperial')).toBe(expected)
  })

  it.each([
    [10, '25 cm'],
    [60, '1.52 m'],
  ])('metric %d -> %s', (inches, expected) => {
    expect(formatLength(inches, 'metric')).toBe(expected)
  })
})
