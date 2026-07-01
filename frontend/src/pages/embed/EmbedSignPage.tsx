import { useEffect, useLayoutEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { setEmbedApiKey } from '../../api/embedAuth'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { prefetchMachineIp } from '../../utils/machineIp'
import { SigningProfileStep } from '../../components/signing/SigningProfileStep'
import { SigningEngine } from '../../signing-engine/SigningEngine'
import { SigningErrorState, SigningLoadingState } from '../../components/signing/SigningStates'
import { useSigningProfileGate } from '../../hooks/useSigningProfileGate'
import { useSigningSession } from '../../hooks/useSigningSession'
import './embed.css'

export function EmbedSignPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const apiKey = searchParams.get('apiKey')?.trim() ?? ''
  const queryClient = useQueryClient()

  useLayoutEffect(() => {
    if (apiKey) setEmbedApiKey(apiKey)
  }, [apiKey])
  const { data, isLoading, error } = useSigningSession(token)
  const {
    needsProfileStep,
    isSavingProfile,
    initialProfileType,
    confirmProfile,
  } = useSigningProfileGate(token, data?.document, data?.recipientId)

  useEffect(() => {
    document.body.classList.add('signflow-embed', 'signing-portal')
    document.documentElement.classList.add('signflow-embed-doc')
    prefetchMachineIp()
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
        onComplete={async (fieldValues) => {
          await api.signing.complete(token, fieldValues)
          await queryClient.invalidateQueries({ queryKey: ['signing-session', token] })
        }}
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
