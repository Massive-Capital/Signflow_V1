import { useState } from 'react'
import { PageHeader } from '../../components/common/PageHeader'
import { EmbedCodePreview, PlaygroundConfig } from '../../components/developer/DeveloperPanel'
import { EmbeddedSigningDemo } from '../../components/signing/EmbeddedSigningDemo'

export function PlaygroundPage() {
  const [apiKey, setApiKey] = useState('pk_test_yyyyyyyyyyyy')
  const [documentId, setDocumentId] = useState('doc_001')

  return (
    <div>
      <PageHeader back="/developer" title="Interactive Playground" description="Test embedded signing and generate embed code" />
      <div className="form-row">
        <PlaygroundConfig
          apiKey={apiKey}
          documentId={documentId}
          onApiKeyChange={setApiKey}
          onDocumentIdChange={setDocumentId}
        />
        <EmbedCodePreview apiKey={apiKey} documentId={documentId} />
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <EmbeddedSigningDemo />
      </div>
    </div>
  )
}
