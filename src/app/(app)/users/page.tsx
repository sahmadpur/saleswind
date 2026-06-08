import { requireRole } from "@/lib/session";
import { listUsers } from "@/services/user-service";
import { createUserAction } from "@/actions/user-actions";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "bg-gviolet-50 text-gviolet",
  MANAGER: "bg-gblue-100 text-gblue-dark",
  AGENT: "bg-ggreen-50 text-ggreen",
};

const TH = "px-5 py-3 text-xs font-medium uppercase tracking-wide text-ggrey";

export default async function UsersPage() {
  await requireRole("users:manage");
  const users = await listUsers();
  return (
    <div className="space-y-8">
      <PageHeader title="Users" subtitle="Manage who can access Saleswind" />

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

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <CardLabel>Team</CardLabel>
          <span className="rounded-full bg-ghover px-2.5 py-0.5 text-xs font-medium text-ggrey">{users.length}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="border-y border-gline-2 bg-gbg text-left">
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Email</th>
              <th className={TH}>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gline-2 transition-colors last:border-0 hover:bg-gblue-50/60">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3 font-medium text-gink">
                    <Avatar name={u.name ?? u.email ?? "?"} size={28} />
                    {u.name}
                  </span>
                </td>
                <td className="px-5 py-3 text-gink-2">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLE[u.role] ?? "bg-ghover text-ggrey"}`}>
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
