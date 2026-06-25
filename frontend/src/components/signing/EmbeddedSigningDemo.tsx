import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { Button } from '../ui/Button'
import { documents } from '../../api/mockData'
import { SigningEngine } from '../../signing-engine/SigningEngine'

const DEMO_DOCUMENT = documents.find((document) => document.id === 'doc_001') ?? documents[0]

export function EmbeddedSigningDemo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="embedded-demo">
      <h3>Embedded Signing Demo</h3>
      <p>Simulates SignFlow.open() SDK behavior</p>
      <Button icon={PenLine} onClick={() => setOpen(true)}>
        Sign NDA
      </Button>
      {open && (
        <div className="embedded-modal-overlay">
          <div className="embedded-modal">
            <div className="embedded-modal-header">
              <span>SignFlow</span>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </div>
            <EmbeddedSigningContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function EmbeddedSigningContent({ onClose }: { onClose: () => void }) {
  return (
    <SigningEngine
      document={DEMO_DOCUMENT}
      recipientId="rec_1"
      mode="embedded"
      onComplete={onClose}
      onEvent={(event, payload) => {
        console.log('SDK Event:', event, payload)
        if (event === 'completed') onClose()
      }}
      branding={{ primaryColor: '#2563eb' }}
    />
  )
}
