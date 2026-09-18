"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { disconnectOutlookAction, syncMeetingsAction } from "@/actions/meeting-actions";

export function SyncControls({ email, lastSynced }: { email: string; lastSynced: string | null }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ggrey">
      <span className="inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-ggreen" style={{ fontSize: 16 }}>check_circle</span>
        {email}
      </span>
      {lastSynced && <span>Synced {lastSynced}</span>}
      <Button
        variant="ghost"
        className="h-8 px-2.5"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await syncMeetingsAction();
          setNote(r.error ?? null);
        })}
      >
        <Icon name="sync" />
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      <Button
        variant="ghost"
        className="h-8 px-2.5 text-ggrey"
        disabled={pending}
        onClick={() => { if (confirm("Disconnect Outlook? Meetings disappear from Saleswind (not from Outlook).")) start(() => disconnectOutlookAction()); }}
      >
        Disconnect
      </Button>
      {note && <span className="text-gred">{note}</span>}
    </div>
  );
}
