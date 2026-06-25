import type { DocumentField } from '../types'

type RadioFieldLike = Pick<
  DocumentField,
  'id' | 'type' | 'recipientId' | 'page' | 'x' | 'y' | 'width' | 'height' | 'radioGroupId'
>

const MAX_VERTICAL_GAP = 12
const MAX_HORIZONTAL_OFFSET = 25

function countExplicitGroupMembers(fields: RadioFieldLike[], radioGroupId: string): number {
  return fields.filter((field) => field.type === 'radio' && field.radioGroupId === radioGroupId)
    .length
}

export function resolveRadioGroupIds(fields: DocumentField[]): Map<string, string> {
  const assignment = new Map<string, string>()
  const radios = fields.filter((field) => field.type === 'radio')

  for (const field of radios) {
    if (field.radioGroupId && countExplicitGroupMembers(fields, field.radioGroupId) > 1) {
      assignment.set(field.id, field.radioGroupId)
    }
  }

  const buckets = new Map<string, RadioFieldLike[]>()
  for (const field of radios) {
    if (assignment.has(field.id)) continue
    const key = `${field.recipientId}:${field.page}`
    const list = buckets.get(key) ?? []
    list.push(field)
    buckets.set(key, list)
  }

  for (const bucket of buckets.values()) {
    if (bucket.length <= 1) {
      const field = bucket[0]
      assignment.set(field.id, field.radioGroupId ?? field.id)
      continue
    }

    const sorted = [...bucket].sort((a, b) => a.y - b.y || a.x - b.x)
    let cluster: RadioFieldLike[] = []

    const assignCluster = () => {
      if (cluster.length === 0) return
      const groupId =
        cluster.length === 1
          ? cluster[0].radioGroupId ?? cluster[0].id
          : `rg_${cluster[0].recipientId}_${cluster[0].page}_${Math.round(cluster[0].y)}`
      for (const field of cluster) {
        assignment.set(field.id, groupId)
      }
      cluster = []
    }

    for (const candidate of sorted) {
      if (cluster.length === 0) {
        cluster.push(candidate)
        continue
      }

      const previous = cluster[cluster.length - 1]
      const gap = candidate.y - (previous.y + previous.height)
      const aligned = Math.abs(candidate.x - previous.x) <= MAX_HORIZONTAL_OFFSET
      if (gap <= MAX_VERTICAL_GAP && aligned) {
        cluster.push(candidate)
      } else {
        assignCluster()
        cluster.push(candidate)
      }
    }

    assignCluster()
  }

  return assignment
}

export function getRadioGroupId(
  field: Pick<DocumentField, 'id' | 'type' | 'radioGroupId'>,
  fields?: DocumentField[],
): string | undefined {
  if (field.type !== 'radio') return undefined
  if (fields) {
    return resolveRadioGroupIds(fields).get(field.id) ?? field.radioGroupId ?? field.id
  }
  return field.radioGroupId ?? field.id
}

export function getRadioGroupFields(fields: DocumentField[], groupId: string): DocumentField[] {
  const resolved = resolveRadioGroupIds(fields)
  return fields.filter(
    (field) => field.type === 'radio' && resolved.get(field.id) === groupId,
  )
}

export function isRadioSelected(fieldValues: Record<string, string>, fieldId: string): boolean {
  return fieldValues[fieldId] === 'selected'
}

export function isRadioGroupFilled(
  fields: DocumentField[],
  fieldValues: Record<string, string>,
  groupId: string,
): boolean {
  return getRadioGroupFields(fields, groupId).some((field) => isRadioSelected(fieldValues, field.id))
}

/** Apply mutual exclusion: one selected option per radio group. */
export function buildRadioGroupSelectionUpdates(
  fields: DocumentField[],
  selectedFieldId: string,
): Record<string, string> {
  const field = fields.find((item) => item.id === selectedFieldId)
  if (!field || field.type !== 'radio') {
    return { [selectedFieldId]: 'selected' }
  }

  const groupId = getRadioGroupId(field, fields)
  if (!groupId) {
    return { [selectedFieldId]: 'selected' }
  }

  const updates: Record<string, string> = {}
  for (const groupField of getRadioGroupFields(fields, groupId)) {
    updates[groupField.id] = groupField.id === selectedFieldId ? 'selected' : ''
  }
  return updates
}

/** When placing a new radio option near an existing one, join that group. */
export function findNearbyRadioGroupId(
  fields: DocumentField[],
  recipientId: string,
  page: number,
  x: number,
  y: number,
  maxDistancePercent = 25,
): string | undefined {
  const candidates = fields.filter(
    (field) => field.type === 'radio' && field.recipientId === recipientId && field.page === page,
  )
  if (candidates.length === 0) return undefined

  const resolved = resolveRadioGroupIds(fields)
  let nearest: DocumentField | undefined
  let nearestDistance = Infinity

  for (const field of candidates) {
    const centerX = field.x + field.width / 2
    const centerY = field.y + field.height / 2
    const distance = Math.hypot(centerX - x, centerY - y)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = field
    }
  }

  if (!nearest || nearestDistance > maxDistancePercent) {
    return undefined
  }

  return resolved.get(nearest.id) ?? nearest.radioGroupId ?? nearest.id
}

/** One entry per radio group for progress / required checks */
export function collapseRadioGroupsForValidation(fields: DocumentField[]): DocumentField[] {
  const resolved = resolveRadioGroupIds(fields)
  const seenGroups = new Set<string>()
  const result: DocumentField[] = []

  for (const field of fields) {
    if (field.type === 'radio') {
      const groupId = resolved.get(field.id)
      if (!groupId || seenGroups.has(groupId)) continue
      seenGroups.add(groupId)
    }
    result.push(field)
  }

  return result
}

export function areRequiredFieldsComplete(
  fields: DocumentField[],
  fieldValues: Record<string, string>,
): boolean {
  const required = collapseRadioGroupsForValidation(fields.filter((field) => field.required))

  return required.every((field) => {
    if (field.type === 'radio') {
      const groupId = getRadioGroupId(field, fields)
      return groupId ? isRadioGroupFilled(fields, fieldValues, groupId) : isRadioSelected(fieldValues, field.id)
    }
    return Boolean(fieldValues[field.id])
  })
}

export function getNextRadioOptionLabel(fields: DocumentField[], groupId: string): string {
  return `Option ${getRadioGroupFields(fields, groupId).length + 1}`
}
