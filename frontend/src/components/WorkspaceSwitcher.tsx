import { Dropdown, DropdownItem } from './ui/Dropdown'
import { useWorkspaceStore } from '../stores/workspaceStore'

export function WorkspaceSwitcher() {
  const { organizations, currentOrganization, setOrganization } = useWorkspaceStore()

  return (
    <div className="workspace-switcher">
      <Dropdown
        align="left"
        trigger={
          <button type="button" className="workspace-trigger">
            <div>
              <div className="workspace-name">{currentOrganization.name}</div>
              <div className="workspace-plan">{currentOrganization.plan} plan</div>
            </div>
            <span>▾</span>
          </button>
        }
      >
        <div className="workspace-menu">
          {organizations.map((org) => (
            <DropdownItem
              key={org.id}
              active={org.id === currentOrganization.id}
              onClick={() => setOrganization(org.id)}
            >
              {org.name}
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
    </div>
  )
}
