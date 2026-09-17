"use client";
import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { deleteTaskAction, setTaskStatusAction } from "@/actions/task-actions";
import { cn } from "@/lib/cn";
import { TASK_STATUS, TASK_STATUSES, type TaskStatusValue } from "@/lib/task-status";
import type { TaskItem } from "@/components/tasks/TaskList";


function CardMenu({ task, onMove }: { task: TaskItem; onMove: (s: TaskStatusValue) => void }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Actions for "${task.title}"`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-6 w-6 place-items-center rounded text-ggrey-2 transition-colors hover:bg-ghover hover:text-gink"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
      </button>
      {open && (
        <div role="menu" className="g-pop absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-gline-2 bg-gsurface py-1 shadow-g2">
          {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onMove(s); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gink hover:bg-ghover"
            >
              <span className={cn("h-2 w-2 rounded-full", TASK_STATUS[s].dot)} />
              Move to {TASK_STATUS[s].label}
            </button>
          ))}
          <div className="my-1 border-t border-gline-2" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); if (confirm(`Delete "${task.title}"?`)) start(() => deleteTaskAction(task.id)); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gred hover:bg-gred-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Card({ task, onMove, onDragStart }: { task: TaskItem; onMove: (s: TaskStatusValue) => void; onDragStart: () => void }) {
  const finished = task.status === "DONE" || task.status === "CANCELLED";
  return (
    <div
      draggable={task.canEdit}
      onDragStart={(e) => {
        // Firefox only starts a drag when data is set; the board tracks the id itself.
        e.dataTransfer.setData("text/plain", task.title);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      data-task-id={task.id}
      className={cn("rounded-md border border-gline-2 bg-gsurface p-3 transition-colors hover:border-gline", task.canEdit && "cursor-grab active:cursor-grabbing")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("min-w-0 text-sm font-medium text-gink", finished && "text-ggrey line-through")}>{task.title}</p>
        {task.canEdit && <CardMenu task={task} onMove={onMove} />}
      </div>
      {(task.due || task.opportunity) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ggrey">
          {task.due && (
            <span className={cn("inline-flex items-center gap-1", !finished && task.dueState === "overdue" && "font-medium text-gred", !finished && task.dueState === "today" && "font-medium text-gyellow-dark")}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
              {!finished && task.dueState === "overdue" ? `Overdue · ${task.due}` : !finished && task.dueState === "today" ? "Due today" : task.due}
            </span>
          )}
          {task.opportunity && (
            <Link href={task.opportunity.href} draggable={false} className="inline-flex min-w-0 items-center gap-1 hover:text-gblue">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>monitoring</span>
              <span className="truncate">{task.opportunity.label}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Kanban of the user's tasks. Cards move by drag and drop or via each card's menu; moves are optimistic. */
export function TaskBoard({ tasks }: { tasks: TaskItem[] }) {
  const [optimistic, move] = useOptimistic(tasks, (state, { id, status }: { id: string; status: TaskStatusValue }) =>
    state.map((t) => (t.id === id ? { ...t, status, done: status === "DONE" } : t)),
  );
  const [, start] = useTransition();
  const [over, setOver] = useState<TaskStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragging = useRef<string | null>(null);

  function moveTo(id: string, status: TaskStatusValue) {
    const task = optimistic.find((t) => t.id === id);
    if (!task || task.status === status || !task.canEdit) return;
    setError(null);
    start(async () => {
      move({ id, status });
      const res = await setTaskStatusAction(id, status);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-md bg-gred-50 px-3 py-2 text-sm text-gred">{error}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const items = optimistic.filter((t) => t.status === status);
          const m = TASK_STATUS[status];
          return (
            <section
              key={status}
              aria-label={m.label}
              data-status={status}
              onDragOver={(e) => { if (dragging.current) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(status); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = dragging.current;
                dragging.current = null;
                if (id) moveTo(id, status);
              }}
              className={cn("flex min-h-48 flex-col rounded-lg border bg-gbg transition-colors", over === status ? "border-gblue bg-gblue-50" : "border-gline-2")}
            >
              <div className={cn("h-[3px] rounded-t-lg", m.bar)} />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-gink">
                  <span className={cn("h-2 w-2 rounded-full", m.dot)} />
                  {m.label}
                </span>
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-gsurface px-2 text-xs font-medium text-ggrey">{items.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 px-3 pb-3">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gline px-3 py-6 text-center text-xs text-ggrey-2">Drop tasks here</div>
                )}
                {items.map((t) => (
                  <div key={t.id} onDragEnd={() => { dragging.current = null; setOver(null); }}>
                    <Card task={t} onMove={(s) => moveTo(t.id, s)} onDragStart={() => { dragging.current = t.id; }} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
