/** All amounts in the app are Polish złoty. */
export const CURRENCY = 'PLN'

const plain = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const twoDecimals = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Format an amount as PLN, e.g. 1250 -> "1 250 PLN", or "1 250,00 PLN" with decimals.
 * Strings are parsed first ("1250zl" -> 1250); values without a number are returned as-is.
 */
export function formatPLN(amount: number | string | null | undefined, { decimals = false } = {}): string {
  const value = typeof amount === 'number' ? amount : parseAmount(amount)
  if (value === null) return typeof amount === 'string' ? amount : ''
  return `${(decimals ? twoDecimals : plain).format(value)} ${CURRENCY}`
}

/**
 * Read a number out of free text: "1250zl" -> 1250, "1 250,50 zł" -> 1250.5, "PLN 900" -> 900.
 * Returns null when there is no number.
 */
export function parseAmount(text: string | null | undefined): number | null {
  if (!text) return null
  const match = String(text).replace(/\s/g, '').match(/\d+(?:[.,]\d{1,2})?/)
  if (!match) return null
  const value = Number(match[0].replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Normalise a typed amount for storage as a plain number string ("1250zl" -> "1250"); '' when empty. */
export function normalizeAmount(text: string | null | undefined): string {
  const value = parseAmount(text)
  return value === null ? '' : String(value)
}
