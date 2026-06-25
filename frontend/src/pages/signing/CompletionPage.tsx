import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CompletionCard } from '../../components/signing/SigningStates'
import { PageTitle } from '../../components/common/PageTitle'
import { loadSigningCompletion, type SigningCompletionInfo } from '../../utils/pdf'

export function CompletionPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [completion, setCompletion] = useState<SigningCompletionInfo | null>(null)

  useEffect(() => {
    setCompletion(loadSigningCompletion())
  }, [])

  return (
    <div className="completion-page">
      <PageTitle title="Signing Complete" />
      <CompletionCard
        title={completion?.title}
        token={completion?.token ?? token}
        completedAt={completion?.completedAt}
      />
    </div>
  )
}
