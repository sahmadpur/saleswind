"use client";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";

/** Lets a form inside the dialog close it after a successful save. No-op outside a dialog. */
const CloseDialog = createContext<() => void>(() => {});
export const useCloseDialog = () => useContext(CloseDialog);

/** Pencil button that opens an edit form in a modal. `compact` is the icon-only version for table rows. */
export function EditDialogButton({ title, label = "Edit", compact = false, children }: {
  title: string; label?: string; compact?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={title}
          aria-label={title}
          className="grid h-8 w-8 place-items-center rounded-md text-ggrey transition-colors hover:bg-ghover hover:text-gblue"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
        </button>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Icon name="edit" />
          {label}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={title} size="lg">
        {/* Mounts fresh on each open so the form starts from the saved values. */}
        {open && <CloseDialog.Provider value={() => setOpen(false)}>{children}</CloseDialog.Provider>}
      </Dialog>
    </>
  );
}
