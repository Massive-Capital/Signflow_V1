import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { SigningProfileStep } from '../../components/signing/SigningProfileStep'
import { SigningEngine } from '../../signing-engine/SigningEngine'
import { SigningErrorState, SigningLoadingState } from '../../components/signing/SigningStates'
import { useSigningProfileGate } from '../../hooks/useSigningProfileGate'
import { useSigningSession } from '../../hooks/useSigningSession'
import './embed.css'

export function EmbedSignPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, error } = useSigningSession(token)
  const {
    needsProfileStep,
    isSavingProfile,
    profileError,
    initialProfileType,
    confirmProfile,
  } = useSigningProfileGate(token, data?.document, data?.recipientId)

  useEffect(() => {
    document.body.classList.add('signflow-embed', 'signing-portal')
    document.documentElement.classList.add('signflow-embed-doc')
    return () => {
      document.body.classList.remove('signflow-embed', 'signing-portal')
      document.documentElement.classList.remove('signflow-embed-doc')
    }
  }, [])

  if (isLoading) return <SigningLoadingState />
  if (error || !data || !token) return <SigningErrorState />

  if (needsProfileStep) {
    return (
      <div className="embed-sign-shell">
        <SigningProfileStep
          initialProfileType={initialProfileType}
          isSaving={isSavingProfile}
          onConfirm={confirmProfile}
        />
        {profileError && <p className="signing-profile-step-error">{profileError}</p>}
      </div>
    )
  }

  return (
    <div className="embed-sign-shell">
      <SigningEngine
        document={data.document}
        recipientId={data.recipientId}
        investorRecipientId={data.investorRecipientId}
        mode="iframe"
        token={token}
        onComplete={(fieldValues) => api.signing.complete(token, fieldValues)}
        onEvent={(event, payload) => {
          if (event === 'completed' || event === 'loaded') {
            window.parent.postMessage(
              { source: 'signflow-embed', event, ...(payload ?? {}) },
              '*',
            )
          }
        }}
      />
    </div>
  )
}
