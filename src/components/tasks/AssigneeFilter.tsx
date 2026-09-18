"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";

/** Whose tasks the Tasks page shows: everyone, me, or one teammate. Kept in the URL as `who`. */
export function AssigneeFilter({ value, users, baseQuery }: {
  value: string; users: { id: string; label: string }[]; baseQuery: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <Select
      aria-label="Assignee"
      value={value}
      onChange={(e) => {
        const qs = new URLSearchParams(baseQuery);
        if (e.target.value === "all") qs.delete("who");
        else qs.set("who", e.target.value);
        router.push(`/tasks${qs.size ? `?${qs}` : ""}`);
      }}
      className="h-9 min-w-40 text-[13px]"
      style={{ width: "auto" }}
    >
      <option value="all">Everyone</option>
      <option value="me">Me</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
    </Select>
  );
}
