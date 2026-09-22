"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";

/** Whose calendar an admin or manager is looking at. Kept in the URL as `user`; viewing is read-only. */
export function UserPicker({ value, meId, users }: {
  value: string; meId: string; users: { id: string; name: string }[];
}) {
  const router = useRouter();
  return (
    <Select
      aria-label="Whose calendar"
      value={value}
      onChange={(e) => router.push(e.target.value === meId ? "/meetings" : `/meetings?user=${encodeURIComponent(e.target.value)}`)}
      className="h-9 min-w-48 text-[13px]"
      style={{ width: "auto" }}
    >
      {users.map((u) => <option key={u.id} value={u.id}>{u.id === meId ? "My calendar" : u.name}</option>)}
    </Select>
  );
}
