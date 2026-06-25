import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

interface PageBackButtonProps {
  to?: string
  label?: string
}

export function PageBackButton({ to, label = 'Back' }: PageBackButtonProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (to) {
      navigate(to)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="btn-bordered-action"
      icon={ArrowLeft}
      onClick={handleBack}
      aria-label="Go back"
    >
      {label}
    </Button>
  )
}
