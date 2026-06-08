import { requireRole } from "@/lib/session";
import { listUsers } from "@/services/user-service";
import { createUserAction } from "@/actions/user-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function UsersPage() {
  await requireRole("users:manage");
  const users = await listUsers();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">Users</h1>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Add user</h2>
        <form action={createUserAction.bind(null, {}) as (formData: FormData) => void} className="grid max-w-2xl grid-cols-2 gap-3">
          <input name="name" placeholder="Name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
          <input name="email" type="email" placeholder="Email" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
          <input name="password" type="password" placeholder="Temp password (min 8)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
          <select name="role" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" defaultValue="AGENT">
            <option value="AGENT">Agent</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
          </select>
          <Button type="submit">Create user</Button>
        </form>
      </Card>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100"><td className="p-4">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4">{u.role}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
