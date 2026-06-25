import type { Recipient, WorkflowType } from '../types'

export function buildInitialSigningOrder(recipients: Recipient[]): string[] {
  return [...recipients]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((recipient) => recipient.id)
}

export function moveSigningOrderItem(
  order: string[],
  index: number,
  direction: 'up' | 'down',
): string[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= order.length) return order

  const next = [...order]
  const [item] = next.splice(index, 1)
  next.splice(targetIndex, 0, item)
  return next
}

export function orderRecipientsBySigningOrder(
  recipients: Recipient[],
  signingOrder: string[],
): Recipient[] {
  const byId = new Map(recipients.map((recipient) => [recipient.id, recipient]))

  return signingOrder.flatMap((id, index) => {
    const recipient = byId.get(id)
    if (!recipient) return []
    return [{ ...recipient, order: index + 1 }]
  })
}

export function sortRecipientsByOrder(recipients: Recipient[]): Recipient[] {
  return [...recipients].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  )
}

export function getWorkflowTypeLabel(workflowType: WorkflowType | undefined): string {
  return workflowType === 'sequential' ? 'Sequential' : 'Parallel'
}
