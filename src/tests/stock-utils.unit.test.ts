import { describe, it, expect } from 'vitest'
import {
  calcCurrentStock,
  isLowStock,
  shortageAmount,
  formatQty,
  parseCsvRow,
  isValidPrice,
} from '@/lib/stock-utils'

// ── calcCurrentStock ──────────────────────────────────────────────────────────

describe('calcCurrentStock', () => {
  it('returns 0 for an empty ledger', () => {
    expect(calcCurrentStock([])).toBe(0)
  })

  it('sums positive entries (goods received)', () => {
    const entries = [{ changeQty: 10 }, { changeQty: 5 }, { changeQty: 20 }]
    expect(calcCurrentStock(entries)).toBe(35)
  })

  it('subtracts negative entries (sales / adjustments)', () => {
    const entries = [{ changeQty: 50 }, { changeQty: -10 }, { changeQty: -5 }]
    expect(calcCurrentStock(entries)).toBe(35)
  })

  it('handles mixed entries correctly', () => {
    const entries = [
      { changeQty:  100 },   // receive
      { changeQty:  -20 },   // sold
      { changeQty:   50 },   // receive
      { changeQty:   -5 },   // spoilage
      { changeQty:  -30 },   // sold
    ]
    expect(calcCurrentStock(entries)).toBe(95)
  })

  it('handles fractional quantities (lb/kg units)', () => {
    const entries = [{ changeQty: 2.5 }, { changeQty: -0.75 }]
    expect(calcCurrentStock(entries)).toBeCloseTo(1.75)
  })

  it('handles string changeQty values (Prisma Decimal serialised as string)', () => {
    const entries = [{ changeQty: '12.500' }, { changeQty: '-3.000' }]
    expect(calcCurrentStock(entries)).toBeCloseTo(9.5)
  })

  it('returns negative stock when adjustments exceed receipts', () => {
    const entries = [{ changeQty: 5 }, { changeQty: -10 }]
    expect(calcCurrentStock(entries)).toBe(-5)
  })
})

// ── isLowStock ────────────────────────────────────────────────────────────────

describe('isLowStock', () => {
  it('returns true when stock equals reorder point', () => {
    expect(isLowStock(10, 10)).toBe(true)
  })

  it('returns true when stock is below reorder point', () => {
    expect(isLowStock(3, 10)).toBe(true)
  })

  it('returns true for zero stock', () => {
    expect(isLowStock(0, 5)).toBe(true)
  })

  it('returns true for negative stock', () => {
    expect(isLowStock(-2, 5)).toBe(true)
  })

  it('returns false when stock is above reorder point', () => {
    expect(isLowStock(15, 10)).toBe(false)
  })

  it('returns false when stock is well above reorder point', () => {
    expect(isLowStock(100, 10)).toBe(false)
  })

  it('handles reorder point of 0 (no reorder threshold set)', () => {
    // 0 stock equals 0 reorder point → technically low
    expect(isLowStock(0, 0)).toBe(true)
    // 1 item with 0 reorder point → not low
    expect(isLowStock(1, 0)).toBe(false)
  })
})

// ── shortageAmount ────────────────────────────────────────────────────────────

describe('shortageAmount', () => {
  it('returns 0 when stock is above reorder point', () => {
    expect(shortageAmount(20, 10)).toBe(0)
  })

  it('returns 0 when stock exactly equals reorder point', () => {
    expect(shortageAmount(10, 10)).toBe(0)
  })

  it('returns the correct shortage when below reorder point', () => {
    expect(shortageAmount(3, 10)).toBe(7)
  })

  it('returns the full reorder point when stock is zero', () => {
    expect(shortageAmount(0, 15)).toBe(15)
  })

  it('handles stock below zero (over-sold)', () => {
    expect(shortageAmount(-5, 10)).toBe(15)
  })
})

// ── formatQty ─────────────────────────────────────────────────────────────────

describe('formatQty', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatQty(10)).toBe('10')
    expect(formatQty(0)).toBe('0')
  })

  it('formats fractions with 2 decimal places', () => {
    expect(formatQty(1.5)).toBe('1.50')
    expect(formatQty(0.75)).toBe('0.75')
  })

  it('formats numbers that happen to be whole after arithmetic', () => {
    expect(formatQty(2.0)).toBe('2')
  })
})

// ── parseCsvRow ───────────────────────────────────────────────────────────────

describe('parseCsvRow', () => {
  it('parses a simple comma-separated row', () => {
    expect(parseCsvRow('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('trims whitespace around values', () => {
    expect(parseCsvRow(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles double-quoted fields with commas inside', () => {
    expect(parseCsvRow('"La Hacienda, Inc.",Austin,TX')).toEqual([
      'La Hacienda, Inc.', 'Austin', 'TX',
    ])
  })

  it('handles escaped double quotes inside quoted fields', () => {
    expect(parseCsvRow('"He said ""hello""",next')).toEqual(['He said "hello"', 'next'])
  })

  it('handles empty fields', () => {
    expect(parseCsvRow('a,,c')).toEqual(['a', '', 'c'])
  })

  it('handles a row with only one value', () => {
    expect(parseCsvRow('single')).toEqual(['single'])
  })

  it('strips BOM from the first field via trim()', () => {
    // String.prototype.trim() removes \uFEFF (BOM/ZWNBS), so parseCsvRow
    // automatically handles BOM-prefixed CSV files without special logic.
    const row = parseCsvRow('\uFEFFsku,name')
    expect(row[0]).toBe('sku')
    expect(row[1]).toBe('name')
  })
})

// ── isValidPrice ──────────────────────────────────────────────────────────────

describe('isValidPrice', () => {
  it('accepts whole number prices', () => {
    expect(isValidPrice('5')).toBe(true)
    expect(isValidPrice('100')).toBe(true)
  })

  it('accepts prices with one decimal', () => {
    expect(isValidPrice('1.5')).toBe(true)
  })

  it('accepts prices with two decimals', () => {
    expect(isValidPrice('1.99')).toBe(true)
    expect(isValidPrice('0.50')).toBe(true)
  })

  it('rejects prices with more than two decimal places', () => {
    expect(isValidPrice('1.999')).toBe(false)
  })

  it('rejects non-numeric strings', () => {
    expect(isValidPrice('abc')).toBe(false)
    expect(isValidPrice('')).toBe(false)
    expect(isValidPrice('$1.99')).toBe(false)
  })

  it('rejects negative prices', () => {
    expect(isValidPrice('-1.00')).toBe(false)
  })
})
