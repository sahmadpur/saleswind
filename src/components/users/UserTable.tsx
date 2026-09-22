import type { Role } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { SortableTH } from "@/components/ui/SortableTH";
import { ColResizer, RestoreColumnWidths } from "@/components/ui/ColResizer";
import { EditableCell } from "@/components/ui/EditableCell";
import { DeleteUserButton } from "@/components/users/DeleteUserButton";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { BlockUserButton } from "@/components/users/BlockUserButton";
import { deleteUserAction, setUserBlockedAction, updateUserAction, updateUserFieldAction } from "@/actions/user-actions";
import type { UserField } from "@/schemas/user";
import { USER_SORT, type UserSortKey } from "@/lib/list-sort";
import { shortDate } from "@/lib/format";
import type { SortDir } from "@/lib/table";

export type UserRow = { id: string; name: string; email: string; role: Role; blockedAt: Date | null; createdAt: Date };

export const USERS_SCOPE = "users";

export const ROLE_OPTIONS = [
  { value: "AGENT", label: "Agent" }, { value: "MANAGER", label: "Manager" }, { value: "ADMIN", label: "Admin" },
];

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "bg-gviolet-50 text-gviolet",
  MANAGER: "bg-gsales-50 text-gsales",
  AGENT: "bg-ggreen-50 text-ggreen",
};

const TH = "relative px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gink";
const TD = "px-4 py-2";

function BodyRow({ u, meId }: { u: UserRow; meId: string }) {
  const save = (field: UserField) => updateUserFieldAction.bind(null, u.id, field);
  const name = (
    <span className="flex min-w-0 items-center gap-2 font-medium text-gink">
      <Avatar name={u.name || u.email} size={24} />
      <span className="truncate">{u.name}</span>
    </span>
  );
  const rolePill = (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLE[u.role] ?? "bg-ghover text-ggrey"}`}>
      {u.role.toLowerCase()}
    </span>
  );
  return (
    <tr className={`border-b border-gline-2 transition-colors last:border-0 hover:bg-ghover/70 ${u.blockedAt ? "bg-gbg" : ""}`}>
      <td className={`${TD} max-w-[14rem]`}>
        <EditableCell value={u.name} display={name} kind="text" save={save("name")} label="name" />
      </td>
      <td className={`${TD} text-gink-2`}>{u.email}</td>
      <td className={TD}>
        {/* Changing your own role is refused server-side, so don't offer it here either. */}
        {u.id === meId ? rolePill : (
          <EditableCell value={u.role} display={rolePill} kind="select" options={ROLE_OPTIONS} save={save("role")} label="role" />
        )}
      </td>
      <td className={TD}>
        {u.blockedAt ? (
          <span className="rounded-full bg-gred-50 px-2 py-0.5 text-xs font-medium text-gred" title={`Blocked ${shortDate(u.blockedAt)}`}>Blocked</span>
        ) : (
          <span className="rounded-full bg-ggreen-50 px-2 py-0.5 text-xs font-medium text-ggreen">Active</span>
        )}
      </td>
      <td className={`${TD} whitespace-nowrap tabular-nums text-ggrey-2`}>{shortDate(u.createdAt)}</td>
      <td className={TD}>
        <div className="flex items-center justify-end gap-1">
          <EditUserDialog action={updateUserAction.bind(null, u.id)} user={{ name: u.name, email: u.email, role: u.role }} isSelf={u.id === meId} />
          {u.id !== meId && <BlockUserButton action={setUserBlockedAction.bind(null, u.id, !u.blockedAt)} name={u.name} blocked={!!u.blockedAt} />}
          {u.id !== meId && <DeleteUserButton action={deleteUserAction.bind(null, u.id)} name={u.name} />}
        </div>
      </td>
    </tr>
  );
}

export function UserTable({ rows, sort, dir, query, filtered, meId, footer }: {
  rows: UserRow[]; sort: UserSortKey; dir: SortDir; query: URLSearchParams; filtered: boolean;
  meId: string; footer?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ghover text-ggrey-2">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{filtered ? "filter_alt_off" : "group"}</span>
        </span>
        <p className="text-sm font-medium text-gink">{filtered ? "No users match these filters" : "No users yet"}</p>
      </div>
    );
  }
  const sortable = { sort, dir, defaultDir: USER_SORT.defaultDir, pathname: "/users", extraQuery: query, className: TH, children: <ColResizer /> };
  return (
    <>
      <div className="overflow-x-auto">
        <RestoreColumnWidths scope={USERS_SCOPE} />
        <table data-resizable={USERS_SCOPE} className="w-full text-[13px] leading-5">
          <thead className="border-y-2 border-gline bg-gbg text-left">
            <tr>
              <SortableTH label="Name" sortKey="name" {...sortable} />
              <SortableTH label="Email" sortKey="email" {...sortable} />
              <SortableTH label="Role" sortKey="role" {...sortable} />
              <SortableTH label="Status" sortKey="status" {...sortable} />
              <SortableTH label="Created" sortKey="created" {...sortable} />
              <th data-col="Actions" className={TH}><span className="sr-only">Actions</span><ColResizer /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => <BodyRow key={u.id} u={u} meId={meId} />)}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
