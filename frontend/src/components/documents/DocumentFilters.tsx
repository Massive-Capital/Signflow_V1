import { Link } from 'react-router-dom'
import { FilePlus2, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'
import { DOCUMENT_STATUS_OPTIONS } from '../../constants/fieldTypes'
import type { DocumentStatus } from '../../types'

interface DocumentFiltersProps {
  search: string
  status: DocumentStatus | ''
  onSearchChange: (value: string) => void
  onStatusChange: (value: DocumentStatus | '') => void
}

export function DocumentFilters({ search, status, onSearchChange, onStatusChange }: DocumentFiltersProps) {
  return (
    <div className="filter-bar">
      <Select
        options={DOCUMENT_STATUS_OPTIONS}
        value={status}
        onChange={(e) => onStatusChange(e.target.value as DocumentStatus | '')}
      />
      <div className="filter-bar-right">
        <Input
          icon={Search}
          placeholder="Search documents..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Link to="/documents/new" className="filter-bar-action">
          <Button icon={FilePlus2}>Create Document</Button>
        </Link>
      </div>
    </div>
  )
}
