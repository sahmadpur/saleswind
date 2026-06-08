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
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (toStr(before[key]) !== toStr(after[key])) {
      changes.push({ fieldChanged: key, oldValue: toStr(before[key]), newValue: toStr(after[key]) });
    }
  }
  return changes;
}
