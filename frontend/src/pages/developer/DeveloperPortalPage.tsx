import { useNavigate } from 'react-router-dom'
import { Code2 } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { DeveloperSectionGrid, SdkEventsList, SdkInstallSection } from '../../components/developer/DeveloperPanel'

export function DeveloperPortalPage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader title="Developer Portal" description="Build integrations with SignFlow API and embedded signing SDK">
        <Button icon={Code2} onClick={() => navigate('/developer/playground')}>
          Open API Playground
        </Button>
      </PageHeader>
      <SdkInstallSection />
      <DeveloperSectionGrid />
      <div className="page-section">
        <SdkEventsList />
      </div>
    </div>
  )
}
