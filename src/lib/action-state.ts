/** Shared result shape for form server actions consumed via useActionState. */
export type FormState = {
  ok?: boolean;
  error?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

/** Submitted values to repopulate a form after a failed validation (React resets uncontrolled inputs after an action). */
export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("$ACTION_") && typeof v === "string") out[k] = v;
  }
  return out;
}
