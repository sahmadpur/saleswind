import { relativeTime } from "@/lib/format";

type Entry = { id: string; actionType: string; fieldChanged: string | null; oldValue: string | null; newValue: string | null; createdAt: Date };

function describe(e: Entry): string {
  switch (e.actionType) {
    case "created": return "Created the opportunity";
    case "updated": return `Changed ${e.fieldChanged} from "${e.oldValue ?? "—"}" to "${e.newValue ?? "—"}"`;
    case "advance": return `Advanced to ${e.newValue}`;
    case "back": return `Moved back to ${e.newValue}`;
    case "cancel": return "Cancelled the opportunity";
    case "tag-added": return `Added tag "${e.newValue}"`;
    case "tag-removed": return `Removed tag "${e.oldValue}"`;
    case "comment-deleted": return "Deleted a comment";
    default: return e.actionType;
  }
}

export function ActivityLogView({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-500">Activity history</h2>
      <ol className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <span className="text-neutral-700">{describe(e)}</span>
            <span className="text-xs text-neutral-400">{relativeTime(new Date(e.createdAt))}</span>
          </li>
        ))}
        {entries.length === 0 && <p className="text-sm text-neutral-400">No activity yet</p>}
      </ol>
    </div>
  );
}
