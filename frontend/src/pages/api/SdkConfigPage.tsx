import { PageHeader } from '../../components/common/PageHeader'
import { SdkConfigPanel } from '../../components/api/SdkConfigPanel'

export function SdkConfigPage() {
  return (
    <div>
      <PageHeader title="SDK Configuration" description="Manage allowed domains and callback URLs for embedded signing" />
      <SdkConfigPanel />
    </div>
  )
}
