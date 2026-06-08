export interface FieldChange {
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(after)) {
    if (toStr(before[key]) !== toStr(after[key])) {
      changes.push({ fieldChanged: key, oldValue: toStr(before[key]), newValue: toStr(after[key]) });
    }
  }
  return changes;
}
