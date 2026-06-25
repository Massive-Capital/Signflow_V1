import { useRef, useState, useEffect } from 'react'
import { PenLine } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { CancelButton } from '../components/ui/CancelButton'
import { SignaturePad, type SignaturePadHandle } from './SignaturePad'

type SignatureMethod = 'draw' | 'type' | 'upload'

interface SignatureModalProps {
  open: boolean
  onClose: () => void
  onSave: (value: string) => void
}

export function SignatureModal({ open, onClose, onSave }: SignatureModalProps) {
  const [method, setMethod] = useState<SignatureMethod>('draw')
  const [typedName, setTypedName] = useState('')
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false)
  const signaturePadRef = useRef<SignaturePadHandle>(null)

  const canSave =
    (method === 'type' && typedName.trim().length > 0) ||
    (method === 'draw' && hasDrawnSignature)

  useEffect(() => {
    if (method !== 'draw') {
      setHasDrawnSignature(false)
    }
  }, [method])

  const handleSave = () => {
    if (method === 'type' && typedName.trim()) {
      onSave(`typed:${typedName.trim()}`)
      return
    }

    if (method === 'draw') {
      const dataUrl = signaturePadRef.current?.toDataUrl()
      if (!dataUrl) return
      onSave(`drawn:${dataUrl}`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Signature"
      size="md"
      footer={
        <>
          <CancelButton onClick={onClose} />
          <Button icon={PenLine} onClick={handleSave} disabled={!canSave}>
            Apply Signature
          </Button>
        </>
      }
    >
      <div className="signature-tabs">
        {(['draw', 'type', 'upload'] as SignatureMethod[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`signature-tab ${method === m ? 'active' : ''}`}
            onClick={() => setMethod(m)}
          >
            {m === 'draw' ? 'Draw' : m === 'type' ? 'Type' : 'Upload'}
          </button>
        ))}
      </div>

      {method === 'draw' && (
        <div className="signature-canvas">
          <p>Draw your signature below</p>
          <SignaturePad ref={signaturePadRef} onStrokeChange={setHasDrawnSignature} />
        </div>
      )}

      {method === 'type' && (
        <div className="signature-type">
          <input
            type="text"
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="signature-type-input"
          />
          <div className="signature-preview">{typedName || 'Preview'}</div>
        </div>
      )}

      {method === 'upload' && (
        <div className="signature-upload">
          <div className="upload-zone">
            <p>Upload signature image</p>
            <span className="upload-hint">PNG or JPG, max 2MB</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
