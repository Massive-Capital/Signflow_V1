/**
 * Central app brand name. Update APP_NAME here to change it across the entire application.
 */
export const APP_NAME = 'SignFlow'

interface AppBrandProps {
  className?: string
}

export function AppBrand({ className = 'brand-name' }: AppBrandProps) {
  return <span className={className}>{APP_NAME}</span>
}

export function formatPageTitle(pageName: string): string {
  return `${APP_NAME} | ${pageName}`
}
