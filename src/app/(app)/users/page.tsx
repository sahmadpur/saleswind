import { requireRole } from "@/lib/session";
import { listUsers } from "@/services/user-service";
import { createUserAction } from "@/actions/user-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ResetColumnWidths } from "@/components/ui/ColResizer";
import { TableFilterBar } from "@/components/ui/TableFilterBar";
import { UserTable, USERS_SCOPE, ROLE_OPTIONS, type UserRow } from "@/components/users/UserTable";
import { PAGE_SIZES, paginate, parsePage } from "@/lib/pagination";
import { USER_SORT } from "@/lib/list-sort";
import { applyFilters, haystack, matchesSearch, param, parseListSort, parseMultiFilters, sortList, type QueryParams } from "@/lib/table";

const FILTER_KEYS = ["role", "status"] as const;
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "blocked", label: "Blocked" }];
const RESET = "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gblue transition-colors hover:bg-gblue-50 disabled:cursor-default disabled:text-ggrey-2 disabled:hover:bg-transparent";

const searchable = (u: UserRow) => haystack([u.name, u.email, u.role]);

export default async function UsersPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const params = await searchParams;
  const me = await requireRole("users:manage");
  const all = await listUsers();

  const q = param(params, "q")?.trim() || undefined;
  const filters = parseMultiFilters(params, FILTER_KEYS);
  const { sort, dir } = parseListSort(USER_SORT, param(params, "sort"), param(params, "dir"));
  const { page: requested, size } = parsePage({ page: param(params, "page"), size: param(params, "size") });

  const narrowed = applyFilters(all, filters, { role: (u) => u.role, status: (u) => (u.blockedAt ? "blocked" : "active") });
  const matched = q ? narrowed.filter((u) => matchesSearch(searchable(u), q)) : narrowed;
  const sorted = sortList(matched, USER_SORT, sort, dir);
  const { rows, page } = paginate(sorted, requested, size);

  const query = new URLSearchParams();
  for (const k of FILTER_KEYS) for (const v of filters[k]) query.append(k, v);
  if (q) query.set("q", q);
  query.set("sort", sort);
  query.set("dir", dir);
  if (size !== PAGE_SIZES[0]) query.set("size", String(size));

  const filtered = !!q || FILTER_KEYS.some((k) => filters[k].length > 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Users" />

      <Card>
        <CardLabel>Add user</CardLabel>
        <form
          action={createUserAction.bind(null, {}) as (formData: FormData) => void}
          className="grid max-w-3xl gap-4 sm:grid-cols-2"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ggrey">Name</span>
            <Input name="name" placeholder="Jane Doe" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ggrey">Email</span>
            <Input name="email" type="email" placeholder="jane@company.com" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ggrey">Temporary password</span>
            <Input name="password" type="password" placeholder="Min 8 characters" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ggrey">Role</span>
            <Select name="role" defaultValue="AGENT">
              <option value="AGENT">Agent</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Create user</Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TableFilterBar
          pathname="/users"
          q={q ?? ""}
          searchLabel="Search users"
          searchPlaceholder="Search name, email…"
          filters={filters}
          defs={[
            { key: "role", label: "Role", allLabel: "All roles", options: ROLE_OPTIONS },
            { key: "status", label: "Status", allLabel: "All statuses", options: STATUS_OPTIONS },
          ]}
          keep={{ sort, dir, ...(size !== PAGE_SIZES[0] && { size: String(size) }) }}
        />
        <ResetColumnWidths scope={USERS_SCOPE} className={RESET} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <CardLabel>Team</CardLabel>
          <span className="rounded-full bg-ghover px-2.5 py-0.5 text-xs font-medium text-ggrey">{sorted.length}</span>
        </div>
        <UserTable
          rows={rows}
          sort={sort}
          dir={dir}
          query={query}
          filtered={filtered}
          meId={me.id}
          footer={sorted.length > 0 ? <Pagination pathname="/users" query={query} page={page} size={size} total={sorted.length} sizes={PAGE_SIZES} /> : undefined}
        />
      </Card>
    </div>
  );
}
