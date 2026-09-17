"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function DeleteEntryButton({ action, name }: { action: () => Promise<void>; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className="text-gred"
      disabled={pending}
      onClick={() => { if (confirm(`Delete ${name}?`)) start(() => action()); }}
    >
      <Icon name="delete" />
      Delete
    </Button>
  );
}
