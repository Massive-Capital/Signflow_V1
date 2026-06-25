import { useEffect } from 'react'
import { formatPageTitle } from './AppBrand'

interface PageTitleProps {
  title: string
}

export function PageTitle({ title }: PageTitleProps) {
  useEffect(() => {
    document.title = formatPageTitle(title)
  }, [title])

  return null
}
