import { Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'

export function SdkConfigPanel() {
  return (
    <div className="page-grid">
      <Card title="Allowed Domains">
        <ul className="domain-list">
          <li>app.acme.com <Button size="sm" variant="ghost" icon={Trash2}>Remove</Button></li>
          <li>localhost:5177 <Button size="sm" variant="ghost" icon={Trash2}>Remove</Button></li>
        </ul>
        <Input placeholder="Add domain..." style={{ marginTop: '1rem' }} />
      </Card>
      <Card title="Callback URLs">
        <Input label="On Complete" defaultValue="https://app.acme.com/signing/complete" />
        <Input label="On Decline" defaultValue="https://app.acme.com/signing/declined" style={{ marginTop: '1rem' }} />
      </Card>
      <Card title="Branding">
        <Input label="Logo URL" placeholder="https://..." />
        <div className="form-row" style={{ marginTop: '1rem' }}>
          <Input label="Primary Color" defaultValue="#2563eb" type="color" />
          <Input label="Button Color" defaultValue="#2563eb" type="color" />
        </div>
      </Card>
    </div>
  )
}
