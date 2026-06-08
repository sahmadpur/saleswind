import { relativeTime } from "@/lib/format";

type Entry = { id: string; actionType: string; fieldChanged: string | null; oldValue: string | null; newValue: string | null; createdAt: Date };

const ICON: Record<string, { name: string; tint: string; bg: string }> = {
  created: { name: "add_circle", tint: "text-ggreen", bg: "bg-ggreen-50" },
  updated: { name: "edit", tint: "text-gblue", bg: "bg-gblue-100" },
  advance: { name: "arrow_forward", tint: "text-gblue", bg: "bg-gblue-100" },
  back: { name: "arrow_back", tint: "text-[#a36200]", bg: "bg-gyellow-50" },
  cancel: { name: "cancel", tint: "text-gred", bg: "bg-gred-50" },
  "tag-added": { name: "label", tint: "text-gviolet", bg: "bg-gviolet-50" },
  "tag-removed": { name: "label_off", tint: "text-ggrey", bg: "bg-ghover" },
  "comment-deleted": { name: "delete", tint: "text-gred", bg: "bg-gred-50" },
};

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
    <div className="space-y-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-gink">
        <span className="material-symbols-outlined text-ggrey" style={{ fontSize: 20 }}>history</span>
        Activity history
      </h2>
      <ol className="relative space-y-1">
        {entries.map((e, i) => {
          const ic = ICON[e.actionType] ?? { name: "circle", tint: "text-ggrey", bg: "bg-ghover" };
          return (
            <li key={e.id} className="relative flex gap-3 pb-1">
              <div className="flex flex-col items-center">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${ic.bg} ${ic.tint}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ic.name}</span>
                </span>
                {i < entries.length - 1 && <span className="mt-1 w-px flex-1 bg-gline-2" />}
              </div>
              <div className="pb-3 pt-1.5">
                <p className="text-sm text-gink-2">{describe(e)}</p>
                <p className="text-xs text-ggrey-2">{relativeTime(new Date(e.createdAt))}</p>
              </div>
            </li>
          );
        })}
        {entries.length === 0 && <p className="text-sm text-ggrey">No activity yet.</p>}
      </ol>
    </div>
  );
}
