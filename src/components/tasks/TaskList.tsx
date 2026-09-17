"use client";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { deleteTaskAction, setTaskDoneAction } from "@/actions/task-actions";
import { cn } from "@/lib/cn";
import { TASK_STATUS, type TaskStatusValue } from "@/lib/task-status";

export type TaskItem = {
  id: string; title: string; status: TaskStatusValue; done: boolean; canEdit: boolean;
  due: string | null; dueState: "overdue" | "today" | null;
  assignee: string | null; opportunity: { href: string; label: string } | null;
};

function Row({ t }: { t: TaskItem }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useOptimistic(t.done);
  const finished = done || t.status === "CANCELLED";
  return (
    <li className={cn("group flex items-start gap-3 px-4 py-2.5", pending && "opacity-70")}>
      <input
        type="checkbox"
        checked={done}
        disabled={!t.canEdit}
        aria-label={done ? `Reopen "${t.title}"` : `Complete "${t.title}"`}
        onChange={(e) => { const next = e.target.checked; start(async () => { setDone(next); await setTaskDoneAction(t.id, next); }); }}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-gblue"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm text-gink", finished && "text-ggrey-2 line-through")}>{t.title}</p>
          {(t.status === "IN_PROGRESS" || t.status === "CANCELLED") && !done && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-medium", TASK_STATUS[t.status].pill)}>{TASK_STATUS[t.status].label}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ggrey">
          {t.due && (
            <span className={cn("inline-flex items-center gap-1", !finished && t.dueState === "overdue" && "font-medium text-gred", !finished && t.dueState === "today" && "font-medium text-gyellow-dark")}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>event</span>
              {!finished && t.dueState === "overdue" ? `Overdue · ${t.due}` : !finished && t.dueState === "today" ? "Due today" : t.due}
            </span>
          )}
          {t.assignee && (
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
              {t.assignee}
            </span>
          )}
          {t.opportunity && (
            <Link href={t.opportunity.href} className="inline-flex items-center gap-1 hover:text-gblue">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>monitoring</span>
              {t.opportunity.label}
            </Link>
          )}
        </div>
      </div>
      {t.canEdit && (
        <button
          type="button"
          aria-label={`Delete "${t.title}"`}
          onClick={() => start(() => deleteTaskAction(t.id))}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ggrey-2 opacity-0 transition-all hover:bg-gred-50 hover:text-gred focus:opacity-100 group-hover:opacity-100"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
        </button>
      )}
    </li>
  );
}

export function TaskList({ tasks, empty }: { tasks: TaskItem[]; empty: string }) {
  if (tasks.length === 0) return <p className="px-4 py-8 text-center text-sm text-ggrey">{empty}</p>;
  return <ul className="divide-y divide-gline-2">{tasks.map((t) => <Row key={t.id} t={t} />)}</ul>;
}
