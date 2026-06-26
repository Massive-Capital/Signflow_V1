import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { PageTitle } from '../../components/common/PageTitle'
import { SigningProfileStep } from '../../components/signing/SigningProfileStep'
import { SigningEngine } from '../../signing-engine/SigningEngine'
import { SigningErrorState, SigningLoadingState } from '../../components/signing/SigningStates'
import { useSigningProfileGate } from '../../hooks/useSigningProfileGate'
import { useSigningSession } from '../../hooks/useSigningSession'

export function SignDocumentPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, error } = useSigningSession(token)
  const {
    needsProfileStep,
    isSavingProfile,
    initialProfileType,
    confirmProfile,
  } = useSigningProfileGate(token, data?.document, data?.recipientId)

  useEffect(() => {
    document.body.classList.add('signing-portal')
    return () => document.body.classList.remove('signing-portal')
  }, [])

  if (isLoading) return (
    <>
      <PageTitle title="Sign Document" />
      <SigningLoadingState />
    </>
  )
  if (error || !data) return (
    <>
      <PageTitle title="Sign Document" />
      <SigningErrorState />
    </>
  )

  if (needsProfileStep) {
    return (
      <>
        <PageTitle title="Choose Profile" />
        <SigningProfileStep
          initialProfileType={initialProfileType}
          isSaving={isSavingProfile}
          onConfirm={confirmProfile}
        />
      </>
    )
  }

  return (
    <>
      <PageTitle title={data.document.title} />
      <SigningEngine
        document={data.document}
        recipientId={data.recipientId}
        investorRecipientId={data.investorRecipientId}
        mode="public"
        token={token}
        onComplete={(fieldValues) => api.signing.complete(token!, fieldValues)}
      />
    </>
  )
}
