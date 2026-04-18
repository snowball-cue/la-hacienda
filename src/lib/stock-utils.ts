/**
 * Pure utility functions for stock calculations.
 * No database access — fully testable in isolation.
 */

/** Calculate current stock from an append-only ledger. */
export function calcCurrentStock(entries: { changeQty: number | string }[]): number {
  return entries.reduce((sum, e) => sum + Number(e.changeQty), 0)
}

/** True when stock is at or below the reorder threshold. */
export function isLowStock(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= reorderPoint
}

/** Units needed to reach the reorder point (0 if already above it). */
export function shortageAmount(currentStock: number, reorderPoint: number): number {
  return Math.max(0, reorderPoint - currentStock)
}

/** Format a quantity for display — integers show no decimals, fractions show 2. */
export function formatQty(qty: number): string {
  return qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)
}

/**
 * Parse a CSV row respecting quoted fields.
 * Handles: "field with, comma", 'single quotes', and bare values.
 */
export function parseCsvRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === quoteChar) {
        // Peek ahead for escaped quote ("")
        if (line[i + 1] === quoteChar) {
          current += ch
          i++
        } else {
          inQuote = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true
      quoteChar = ch
    } else if (ch === ',') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

/** Validate a price string (e.g. "1.99" or "10"). Returns true if valid. */
export function isValidPrice(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value)
}
