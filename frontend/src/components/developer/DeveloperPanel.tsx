import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DEVELOPER_SECTIONS, SDK_EVENTS } from '../../constants/developerSections'

export function SdkInstallSection() {
  return (
    <Card title="SDK Installation">
      <pre className="code-block"><code>npm install @signflow/sdk</code></pre>
      <pre className="code-block" style={{ marginTop: '0.75rem' }}>
        <code>{`// List documents from your application
const response = await fetch('https://your-api-host/api/v1/documents', {
  headers: {
    Authorization: 'Bearer pk_live_xxx',
    // or: 'X-API-Key': 'pk_live_xxx',
  },
})
const documents = await response.json()`}</code>
      </pre>
    </Card>
  )
}

export function DeveloperSectionGrid() {
  return (
    <div className="dev-grid" style={{ marginTop: '1.25rem' }}>
      {DEVELOPER_SECTIONS.map((section) => (
        <Card key={section.title} title={`${section.icon} ${section.title}`} subtitle={section.description}>
          {section.link.startsWith('/') ? (
            <Link to={section.link}>
              <Button size="sm" variant="secondary" icon={ArrowRight}>View</Button>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" icon={ExternalLink}>View Docs</Button>
          )}
        </Card>
      ))}
    </div>
  )
}

export function SdkEventsList() {
  return (
    <Card title="SDK Events">
      <ul className="event-list">
        {SDK_EVENTS.map((event) => (
          <li key={event.name}>
            <code>{event.name}</code> — {event.description}
          </li>
        ))}
      </ul>
    </Card>
  )
}

interface PlaygroundConfigProps {
  apiKey: string
  documentId: string
  onApiKeyChange: (value: string) => void
  onDocumentIdChange: (value: string) => void
}

export function PlaygroundConfig({ apiKey, documentId, onApiKeyChange, onDocumentIdChange }: PlaygroundConfigProps) {
  return (
    <Card title="Configuration">
      <div className="form-grid">
        <input
          className="playground-input"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="API Key"
        />
        <input
          className="playground-input"
          value={documentId}
          onChange={(e) => onDocumentIdChange(e.target.value)}
          placeholder="Document ID"
        />
      </div>
    </Card>
  )
}

interface EmbedCodePreviewProps {
  apiKey: string
  documentId: string
}

export function EmbedCodePreview({ apiKey, documentId }: EmbedCodePreviewProps) {
  const embedCode = `<script src="https://cdn.signflow.io/sdk.js"></script>
<script>
  SignFlow.open({
    apiKey: "${apiKey}",
    documentId: "${documentId}",
    onCompleted: (data) => console.log(data)
  });
</script>`

  return (
    <Card title="Generated Embed Code">
      <pre className="code-block"><code>{embedCode}</code></pre>
    </Card>
  )
}
