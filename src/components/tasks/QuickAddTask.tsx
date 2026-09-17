"use client";
import { useActionState, useEffect, useRef } from "react";
import { createTaskAction } from "@/actions/task-actions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { FormState } from "@/lib/action-state";

type Option = { id: string; label: string };

/** One-line task entry: title, optional due date, assignee and opportunity. Enter submits. */
export function QuickAddTask({ users, opportunities, opportunityId, currentUserId }: {
  users: Option[]; opportunities?: Option[]; opportunityId?: string; currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(createTaskAction, {} as FormState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) { form.current?.reset(); form.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus(); }
  }, [state]);

  const small = "h-9 text-[13px]";
  return (
    <form ref={form} action={formAction} className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Input name="title" placeholder="Add a task…" required aria-label="Task" defaultValue={state.ok ? "" : state.values?.title} className={small} style={{ width: "auto", flex: "1 1 12rem" }} />
        <Input name="dueDate" type="date" aria-label="Due date" className={small} style={{ width: "auto" }} />
        <Select name="assigneeId" aria-label="Assignee" defaultValue={currentUserId} className={small} style={{ width: "auto" }}>
          {users.map((u) => <option key={u.id} value={u.id}>{u.id === currentUserId ? "Me" : u.label}</option>)}
        </Select>
        {opportunityId ? (
          <input type="hidden" name="opportunityId" value={opportunityId} />
        ) : opportunities ? (
          <Select name="opportunityId" aria-label="Opportunity" defaultValue="" className={`${small} max-w-56`} style={{ width: "auto" }}>
            <option value="">No opportunity</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        ) : null}
        <Button type="submit" disabled={pending}>
          <Icon name="add" />
          Add
        </Button>
      </div>
      {state.error && <p className="text-xs text-gred">{state.error.title?.[0] ?? state.error.dueDate?.[0] ?? state.error._form?.[0] ?? "Could not add task"}</p>}
    </form>
  );
}
