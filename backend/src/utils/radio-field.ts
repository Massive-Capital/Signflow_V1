export interface RadioFieldLike {
  id: string;
  type: string;
  recipientId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  radioGroupId?: string | null;
}

const MAX_VERTICAL_GAP = 12;
const MAX_HORIZONTAL_OFFSET = 25;

function countExplicitGroupMembers(fields: RadioFieldLike[], radioGroupId: string): number {
  return fields.filter((field) => field.type === 'radio' && field.radioGroupId === radioGroupId)
    .length;
}

export function resolveRadioGroupIds<T extends RadioFieldLike>(fields: T[]): Map<string, string> {
  const assignment = new Map<string, string>();
  const radios = fields.filter((field) => field.type === 'radio');

  for (const field of radios) {
    if (field.radioGroupId && countExplicitGroupMembers(fields, field.radioGroupId) > 1) {
      assignment.set(field.id, field.radioGroupId);
    }
  }

  const buckets = new Map<string, T[]>();
  for (const field of radios) {
    if (assignment.has(field.id)) continue;
    const key = `${field.recipientId}:${field.page}`;
    const list = buckets.get(key) ?? [];
    list.push(field);
    buckets.set(key, list);
  }

  for (const bucket of buckets.values()) {
    if (bucket.length <= 1) {
      const field = bucket[0];
      assignment.set(field.id, field.radioGroupId ?? field.id);
      continue;
    }

    const sorted = [...bucket].sort((a, b) => a.y - b.y || a.x - b.x);
    let cluster: T[] = [];

    const assignCluster = () => {
      if (cluster.length === 0) return;
      const groupId =
        cluster.length === 1
          ? cluster[0].radioGroupId ?? cluster[0].id
          : `rg_${cluster[0].recipientId}_${cluster[0].page}_${Math.round(cluster[0].y)}`;
      for (const field of cluster) {
        assignment.set(field.id, groupId);
      }
      cluster = [];
    };

    for (const candidate of sorted) {
      if (cluster.length === 0) {
        cluster.push(candidate);
        continue;
      }

      const previous = cluster[cluster.length - 1];
      const gap = candidate.y - (previous.y + previous.height);
      const aligned = Math.abs(candidate.x - previous.x) <= MAX_HORIZONTAL_OFFSET;
      if (gap <= MAX_VERTICAL_GAP && aligned) {
        cluster.push(candidate);
      } else {
        assignCluster();
        cluster.push(candidate);
      }
    }

    assignCluster();
  }

  return assignment;
}

export function applyResolvedRadioGroups<T extends RadioFieldLike>(fields: T[]): T[] {
  const resolved = resolveRadioGroupIds(
    fields.map((field) => ({
      ...field,
      id: field.id,
    })),
  );
  return fields.map((field) => {
    if (field.type !== 'radio') return field;
    const radioGroupId = resolved.get(field.id);
    if (!radioGroupId || radioGroupId === field.radioGroupId) return field;
    return { ...field, radioGroupId };
  });
}
