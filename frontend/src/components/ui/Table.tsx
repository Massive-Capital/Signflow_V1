import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { compareSortValues, type SortDirection, type SortableValue } from '../../utils/tableSort'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  width?: string
  sortable?: boolean
  sortValue?: (row: T) => SortableValue
  align?: 'left' | 'center' | 'right'
}

interface TableSortState {
  key: string
  direction: SortDirection
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyMessage?: string
  defaultSort?: TableSortState
}

function isSortableColumn<T>(column: Column<T>): boolean {
  return column.sortable !== false && column.key !== 'actions'
}

function getSortValue<T>(row: T, column: Column<T>): SortableValue {
  if (column.sortValue) {
    return column.sortValue(row)
  }

  const value = (row as Record<string, unknown>)[column.key]
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  return value == null ? null : String(value)
}

function getAlignClass(align?: Column<unknown>['align']): string {
  if (align === 'center') return 'table-cell-align-center'
  if (align === 'right') return 'table-cell-align-right'
  return ''
}

export function Table<T extends object>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = 'No data found',
  defaultSort,
}: TableProps<T>) {
  const [sort, setSort] = useState<TableSortState | null>(defaultSort ?? null)

  const sortedData = useMemo(() => {
    if (!sort) return data

    const column = columns.find((col) => col.key === sort.key)
    if (!column || !isSortableColumn(column)) return data

    return [...data].sort((rowA, rowB) => {
      const comparison = compareSortValues(getSortValue(rowA, column), getSortValue(rowB, column))
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [columns, data, sort])

  const handleSort = (column: Column<T>) => {
    if (!isSortableColumn(column)) return

    setSort((current) => {
      if (current?.key === column.key) {
        return { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }

      return { key: column.key, direction: 'asc' }
    })
  }

  if (data.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = isSortableColumn(col)
              const isActive = sort?.key === col.key
              const direction = isActive ? sort.direction : undefined

              return (
                <th
                  key={col.key}
                  className={getAlignClass(col.align)}
                  style={{ width: col.width }}
                  aria-sort={
                    isActive ? (direction === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      className={`table-sort-button ${isActive ? 'active' : ''}`}
                      onClick={() => handleSort(col)}
                    >
                      <span>{col.header}</span>
                      <span className="table-sort-icon" aria-hidden>
                        {isActive ? (
                          direction === 'asc' ? (
                            <ArrowUp size={14} strokeWidth={2.25} />
                          ) : (
                            <ArrowDown size={14} strokeWidth={2.25} />
                          )
                        ) : (
                          <ArrowUpDown size={14} strokeWidth={2.25} />
                        )}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr
              key={String(row[keyField])}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'table-row-clickable' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className={getAlignClass(col.align)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
