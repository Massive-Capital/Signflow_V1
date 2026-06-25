export type SortDirection = 'asc' | 'desc'

export type SortableValue = string | number | boolean | null | undefined

export function compareSortValues(a: SortableValue, b: SortableValue): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
}
