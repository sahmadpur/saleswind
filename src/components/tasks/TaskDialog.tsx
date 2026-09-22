"use client";
import { useActionState, useEffect } from "react";
import { updateTaskAction } from "@/actions/task-actions";
import { useCloseDialog } from "@/components/ui/EditDialogButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import type { FormState } from "@/lib/action-state";

type Option = { id: string; label: string };
export type TaskDraft = { title: string; dueDate: string; assigneeId: string; opportunityId: string };

/** Edit form for an existing task. Mirrors QuickAddTask's fields; status moves from the list or board. */
export function TaskForm({ id, draft, users, opportunities }: {
  id: string; draft: TaskDraft; users: Option[]; opportunities?: Option[];
}) {
  const [state, formAction, pending] = useActionState(updateTaskAction.bind(null, id), {} as FormState);
  const close = useCloseDialog();
  useEffect(() => { if (state.ok) close(); }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ggrey">Task</span>
        <Input name="title" required autoFocus defaultValue={state.values?.title ?? draft.title} />
        <FieldError errors={state.error?.title} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ggrey">Due date</span>
          <Input name="dueDate" type="date" defaultValue={state.values?.dueDate ?? draft.dueDate} />
          <FieldError errors={state.error?.dueDate} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ggrey">Assignee</span>
          <Select name="assigneeId" defaultValue={state.values?.assigneeId ?? draft.assigneeId}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </Select>
          <FieldError errors={state.error?.assigneeId} />
        </label>
      </div>
      {opportunities && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ggrey">Opportunity</span>
          <Select name="opportunityId" defaultValue={state.values?.opportunityId ?? draft.opportunityId}>
            <option value="">No opportunity</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        </label>
      )}
      {!opportunities && <input type="hidden" name="opportunityId" value={draft.opportunityId} />}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        {state.error?._form && <p className="text-sm text-gred">{state.error._form[0]}</p>}
      </div>
    </form>
  );
}
