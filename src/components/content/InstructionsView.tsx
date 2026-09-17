"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { InstructionsEditor } from "@/components/content/InstructionsEditor";
import type { FormState } from "@/lib/action-state";

/** Admin toggle between the rendered page (passed as children from the server) and the editor. */
export function InstructionsView({ canEdit, body, action, children }: {
  canEdit: boolean; body: string; action: (prev: unknown, fd: FormData) => Promise<FormState>; children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) return <InstructionsEditor action={action} body={body} onClose={() => setEditing(false)} />;
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            <Icon name="edit" />
            Edit
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
