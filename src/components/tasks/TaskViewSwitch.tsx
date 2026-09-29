"use client";
import { Segmented } from "@/components/ui/Segmented";
import { TASKS_VIEW_COOKIE, type TasksView } from "@/lib/task-view";

/** Board / List toggle that also remembers the choice in a cookie, so `/tasks` opens the last view next time. */
export function TaskViewSwitch({ view, boardHref, listHref }: { view: TasksView; boardHref: string; listHref: string }) {
  const remember = (v: TasksView) => () => {
    document.cookie = `${TASKS_VIEW_COOKIE}=${v}; path=/; max-age=31536000; SameSite=Lax`;
  };
  return (
    <Segmented
      segments={[
        { label: "Board", href: boardHref, icon: "view_kanban", active: view === "board", onClick: remember("board") },
        { label: "List", href: listHref, icon: "checklist", active: view === "list", onClick: remember("list") },
      ]}
    />
  );
}
