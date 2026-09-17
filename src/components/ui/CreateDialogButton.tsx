"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";

/** Header "+ New …" button that opens a create form in a modal. The form mounts fresh on each open. */
export function CreateDialogButton({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Icon name="add" />
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} size="lg">
        {open && children}
      </Dialog>
    </>
  );
}
