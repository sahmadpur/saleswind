import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/domain/permissions";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { MeetingsView } from "@/components/meetings/MeetingsView";
import { SyncControls } from "@/components/meetings/SyncControls";
import { UserPicker } from "@/components/meetings/UserPicker";
import { getConnection, getConnectionSynced, listConnectedUsers, listMeetings, outlookConfigured, syncWindow } from "@/services/outlook-service";
import { opportunityRef, shortDate, utcToZonedInput } from "@/lib/format";
import { toMeetingItems } from "@/lib/meeting-view";
import { param, type QueryParams } from "@/lib/table";

const MESSAGES: Record<string, string> = {
  connected: "Outlook connected.",
  denied: "Microsoft sign-in was cancelled.",
  invalid: "The sign-in link expired. Try connecting again.",
};

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const user = await requireUser();
  const params = await searchParams;

  if (!outlookConfigured()) {
    return (
      <div className="space-y-5">
        <PageHeader title="Meetings" />
        <Card><p className="text-sm text-ggrey">Outlook sync isn&apos;t set up on this server yet. Ask an admin to add the Microsoft app credentials.</p></Card>
      </div>
    );
  }

  // Admins and managers can look at a teammate's calendar; everyone else only ever sees their own.
  const canViewAll = can(user.role, "meetings:viewAll");
  const requested = param(params, "user");
  const targetId = canViewAll && requested && requested !== user.id ? requested : user.id;
  const readOnly = targetId !== user.id;

  // Never drive someone else's Graph sync off your own page load — just read what was mirrored.
  const connection = readOnly ? await getConnection(targetId) : await getConnectionSynced(user.id);
  const outlookParam = param(params, "outlook");
  const flash = outlookParam === "error" ? param(params, "message") ?? "Could not connect Outlook." : outlookParam ? MESSAGES[outlookParam] : null;

  const connectedUsers = canViewAll ? await listConnectedUsers() : [];
  // The picker always offers you, even before you have connected.
  const pickerUsers = connectedUsers.some((u) => u.id === user.id)
    ? connectedUsers
    : [{ id: user.id, name: user.name ?? "Me" }, ...connectedUsers];
  const picker = canViewAll && pickerUsers.length > 1
    ? <UserPicker value={targetId} meId={user.id} users={pickerUsers} />
    : null;
  const viewing = connectedUsers.find((u) => u.id === targetId)?.name ?? "This user";

  if (!connection) {
    return (
      <div className="space-y-5">
        <PageHeader title="Meetings" actions={picker} />
        {flash && <p className="text-sm text-gred">{flash}</p>}
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gblue-50 text-gblue">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>calendar_month</span>
          </span>
          {readOnly ? (
            <p className="text-sm text-ggrey">{viewing} hasn&apos;t connected an Outlook calendar.</p>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-gink">Connect your Outlook calendar</p>
                <p className="mt-1 max-w-sm text-sm text-ggrey">
                  See your meetings here, link them to opportunities, and schedule new ones — invites go out from your own mailbox.
                </p>
              </div>
              <a href="/api/outlook/connect" className="g-press inline-flex h-9 items-center gap-2 rounded-full bg-gblue px-5 text-sm font-medium text-white hover:bg-gblue-hover">
                <Icon name="link" />
                Connect Outlook
              </a>
            </>
          )}
        </Card>
      </div>
    );
  }

  const [rows, opps] = await Promise.all([
    listMeetings(targetId),
    db.opportunity.findMany({ select: { id: true, number: true, title: true }, orderBy: { number: "desc" } }),
  ]);
  const now = new Date();
  const range = syncWindow(now.getTime());
  const opportunities = opps.map((o) => ({ id: o.id, label: `${opportunityRef(o.number)} ${o.title}` }));

  return (
    <div className="space-y-5">
      <PageHeader title="Meetings" actions={picker} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {readOnly ? (
          <p className="inline-flex items-center gap-2 rounded-md bg-ghover px-3 py-1.5 text-xs text-ggrey">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
            Viewing {viewing}&apos;s calendar ({connection.msEmail}) — read only
            {connection.lastSyncedAt && ` · synced ${shortDate(connection.lastSyncedAt)}`}
          </p>
        ) : (
          <SyncControls email={connection.msEmail} lastSynced={connection.lastSyncedAt ? shortDate(connection.lastSyncedAt) : null} />
        )}
        {flash && outlookParam === "connected" && <span className="text-xs text-ggreen">{flash}</span>}
      </div>
      {!readOnly && connection.lastError && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-gred-50 px-4 py-2.5 text-sm text-gred">
          {connection.lastError}
          <a href="/api/outlook/connect" className="font-medium underline">Reconnect</a>
        </div>
      )}
      <MeetingsView
        meetings={toMeetingItems(rows, now)}
        opportunities={opportunities}
        nowLocal={utcToZonedInput(now)}
        windowStart={utcToZonedInput(range.from).slice(0, 10)}
        windowEnd={utcToZonedInput(range.to).slice(0, 10)}
        readOnly={readOnly}
      />
    </div>
  );
}
