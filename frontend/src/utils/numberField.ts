/**
 * Sanitize numeric input while preserving user formatting (commas, decimals).
 * Only digits, one decimal point, commas, and an optional leading minus are kept.
 */
export function sanitizeNumberInput(raw: string): string {
  if (!raw) return ''

  let result = ''
  let hasDecimal = false

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]

    if (char >= '0' && char <= '9') {
      result += char
      continue
    }

    if (char === ',') {
      result += char
      continue
    }

    if (char === '.' && !hasDecimal) {
      hasDecimal = true
      result += char
      continue
    }

    if (char === '-' && result.length === 0) {
      result += char
    }
  }

  return result
}

export function isNumberFieldValueFilled(value: string | undefined): boolean {
  if (!value) return false
  return /\d/.test(value)
}
