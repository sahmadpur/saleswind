function escape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(escape).join(",");
  const body = rows.map((r) => r.map(escape).join(",")).join("\n");
  return body ? `${head}\n${body}` : head;
}
