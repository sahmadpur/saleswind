import "server-only";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { audit } from "@/services/audit-service";

/**
 * Per-user Outlook calendar via Microsoft Graph (delegated OAuth, authorization-code flow).
 * Raw fetch, no SDK. Events are mirrored into `Meeting` rows so they can be linked to opportunities.
 */

const SCOPES = "offline_access User.Read Calendars.ReadWrite";
const GRAPH = "https://graph.microsoft.com/v1.0";
/** Calendar window mirrored from Outlook. */
export const SYNC_PAST_DAYS = 60;
export const SYNC_FUTURE_DAYS = 180;
/** Meetings page re-syncs on load when the last sync is older than this. */
export const SYNC_STALE_MS = 5 * 60_000;

export class OutlookError extends Error {
  constructor(message: string, readonly reconnect = false) {
    super(message);
    this.name = "OutlookError";
  }
}

function env() {
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) return null;
  return { tenant: MS_TENANT_ID || "common", clientId: MS_CLIENT_ID, clientSecret: MS_CLIENT_SECRET };
}

export const outlookConfigured = () => env() !== null;

export function redirectUri(origin: string) {
  return `${process.env.AUTH_URL || origin}/api/outlook/callback`;
}

export function authUrl(state: string, origin: string) {
  const e = env()!;
  const qs = new URLSearchParams({
    client_id: e.clientId, response_type: "code", redirect_uri: redirectUri(origin), response_mode: "query",
    scope: SCOPES, state, prompt: "select_account",
  });
  return `https://login.microsoftonline.com/${e.tenant}/oauth2/v2.0/authorize?${qs}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const e = env();
  if (!e) throw new OutlookError("Outlook is not configured");
  const res = await fetch(`https://login.microsoftonline.com/${e.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: e.clientId, client_secret: e.clientSecret, scope: SCOPES, ...params }),
  });
  const json = await res.json();
  if (!res.ok) {
    const invalid = json.error === "invalid_grant" || json.error === "interaction_required";
    throw new OutlookError(invalid ? "Your Microsoft sign-in expired. Reconnect Outlook." : `Microsoft sign-in failed: ${json.error_description ?? json.error}`, invalid);
  }
  return json;
}

/** Finish the OAuth flow: store tokens and the mailbox address, then run the first sync. */
export async function connectOutlook(userId: string, code: string, origin: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin) });
  if (!t.refresh_token) throw new OutlookError("Microsoft did not return a refresh token (offline_access missing?)");
  const me = await graphFetch<{ mail?: string; userPrincipalName: string }>(t.access_token, "/me?$select=mail,userPrincipalName");
  const msEmail = me.mail || me.userPrincipalName;
  const data = {
    msEmail,
    accessTokenEnc: encrypt(t.access_token),
    refreshTokenEnc: encrypt(t.refresh_token),
    expiresAt: new Date(Date.now() + (t.expires_in - 60) * 1000),
    lastError: null,
  };
  await db.outlookConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  await audit(db, { userId, action: "outlook.connect", entityType: "user", entityId: userId, summary: `Connected Outlook calendar ${msEmail}` });
  await syncMeetings(userId);
}

export async function disconnectOutlook(userId: string) {
  const c = await db.outlookConnection.findUnique({ where: { userId } });
  if (!c) return;
  await db.$transaction(async (tx) => {
    // Mirrored events go too; links to opportunities are lost with them.
    await tx.meeting.deleteMany({ where: { userId } });
    await tx.outlookConnection.delete({ where: { userId } });
    await audit(tx, { userId, action: "outlook.disconnect", entityType: "user", entityId: userId, summary: `Disconnected Outlook calendar ${c.msEmail}` });
  });
}

/** Re-sync when the last sync is missing or older than SYNC_STALE_MS; returns the (possibly refreshed) connection. */
export async function getConnectionSynced(userId: string) {
  const c = await getConnection(userId);
  if (!c || (c.lastSyncedAt && Date.now() - c.lastSyncedAt.getTime() < SYNC_STALE_MS)) return c;
  await syncMeetings(userId);
  return getConnection(userId);
}

export async function getConnection(userId: string) {
  return db.outlookConnection.findUnique({ where: { userId }, select: { msEmail: true, lastSyncedAt: true, lastError: true } });
}

/** A valid access token, refreshing (and rotating the refresh token) when close to expiry. */
async function accessToken(userId: string): Promise<string> {
  const c = await db.outlookConnection.findUnique({ where: { userId } });
  if (!c) throw new OutlookError("Outlook is not connected", true);
  if (c.expiresAt.getTime() > Date.now()) return decrypt(c.accessTokenEnc);
  try {
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(c.refreshTokenEnc) });
    await db.outlookConnection.update({
      where: { userId },
      data: {
        accessTokenEnc: encrypt(t.access_token),
        ...(t.refresh_token && { refreshTokenEnc: encrypt(t.refresh_token) }),
        expiresAt: new Date(Date.now() + (t.expires_in - 60) * 1000),
      },
    });
    return t.access_token;
  } catch (e) {
    if (e instanceof OutlookError) await db.outlookConnection.update({ where: { userId }, data: { lastError: e.message } });
    throw e;
  }
}

async function graphFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith("https://") ? path : `${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: 'outlook.timezone="UTC"', ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OutlookError(`Outlook request failed: ${json.error?.message ?? res.statusText}`, res.status === 401);
  }
  return json as T;
}

type GraphEvent = {
  id: string; subject: string | null; isAllDay: boolean; isCancelled: boolean; isOrganizer: boolean; webLink: string;
  start: { dateTime: string }; end: { dateTime: string };
  location?: { displayName?: string }; onlineMeeting?: { joinUrl?: string } | null; bodyPreview?: string;
  organizer?: { emailAddress?: { name?: string; address?: string } };
  attendees?: { emailAddress: { name?: string; address?: string }; status?: { response?: string } }[];
};

// Graph returns UTC wall-clock without a zone suffix because of the Prefer header.
const utc = (s: string) => new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : `${s}Z`);

function toRow(e: GraphEvent) {
  return {
    subject: e.subject || "(no subject)",
    start: utc(e.start.dateTime),
    end: utc(e.end.dateTime),
    isAllDay: e.isAllDay,
    location: e.location?.displayName || null,
    joinUrl: e.onlineMeeting?.joinUrl || null,
    webLink: e.webLink || null,
    organizer: e.organizer?.emailAddress?.name || e.organizer?.emailAddress?.address || null,
    isOrganizer: e.isOrganizer,
    attendees: (e.attendees ?? []).map((a) => ({ name: a.emailAddress.name ?? null, email: a.emailAddress.address ?? null, response: a.status?.response ?? null })),
    bodyPreview: e.bodyPreview || null,
  };
}

const SELECT = "id,subject,start,end,isAllDay,isCancelled,isOrganizer,location,onlineMeeting,organizer,attendees,bodyPreview,webLink";

/** Mirror the user's calendar window into Meeting rows; events gone from Outlook are removed (opportunity links kept for the rest). */
export async function syncMeetings(userId: string) {
  let token: string;
  try {
    token = await accessToken(userId);
  } catch (e) {
    if (e instanceof OutlookError) return { error: e.message };
    throw e;
  }
  const { from, to } = syncWindow();
  const events: GraphEvent[] = [];
  try {
    let next: string | undefined =
      `/me/calendarView?startDateTime=${from.toISOString()}&endDateTime=${to.toISOString()}&$select=${SELECT}&$top=100&$orderby=start/dateTime`;
    while (next) {
      const page: { value: GraphEvent[]; "@odata.nextLink"?: string } = await graphFetch(token, next);
      events.push(...page.value.filter((e) => !e.isCancelled));
      next = page["@odata.nextLink"];
    }
  } catch (e) {
    if (e instanceof OutlookError) {
      await db.outlookConnection.update({ where: { userId }, data: { lastError: e.message } });
      return { error: e.message };
    }
    throw e;
  }

  await db.$transaction(async (tx) => {
    for (const e of events) {
      const row = toRow(e);
      await tx.meeting.upsert({
        where: { userId_outlookEventId: { userId, outlookEventId: e.id } },
        create: { userId, outlookEventId: e.id, ...row },
        update: row,
      });
    }
    await tx.meeting.deleteMany({
      where: { userId, start: { gte: from, lt: to }, outlookEventId: { notIn: events.map((e) => e.id) } },
    });
    await tx.outlookConnection.update({ where: { userId }, data: { lastSyncedAt: new Date(), lastError: null } });
  }, { timeout: 30_000 });
  return { count: events.length };
}

/** The date range mirrored from Outlook, relative to now. */
export function syncWindow(now = Date.now()) {
  return { from: new Date(now - SYNC_PAST_DAYS * 86_400_000), to: new Date(now + SYNC_FUTURE_DAYS * 86_400_000) };
}

export type MeetingInput = {
  subject: string; start: Date; end: Date; location?: string; attendees: string[]; online: boolean; notes?: string; opportunityId?: string | null;
};

function eventBody(m: MeetingInput) {
  return {
    subject: m.subject,
    body: { contentType: "text", content: m.notes ?? "" },
    start: { dateTime: m.start.toISOString().replace("Z", ""), timeZone: "UTC" },
    end: { dateTime: m.end.toISOString().replace("Z", ""), timeZone: "UTC" },
    location: { displayName: m.location ?? "" },
    attendees: m.attendees.map((address) => ({ emailAddress: { address }, type: "required" })),
    ...(m.online ? { isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness" } : {}),
  };
}

/** Create in Outlook (invites go out from the user's mailbox), then mirror it. */
export async function createMeeting(userId: string, m: MeetingInput) {
  const token = await accessToken(userId);
  const e = await graphFetch<GraphEvent>(token, `/me/events?$select=${SELECT}`, { method: "POST", body: JSON.stringify(eventBody(m)) });
  const meeting = await db.meeting.create({
    data: { userId, outlookEventId: e.id, ...toRow(e), opportunityId: m.opportunityId || null, createdInApp: true },
  });
  await audit(db, {
    userId, action: "meeting.create", entityType: m.opportunityId ? "opportunity" : "meeting", entityId: m.opportunityId || meeting.id,
    summary: `Scheduled meeting "${meeting.subject}"${m.attendees.length ? ` with ${m.attendees.join(", ")}` : ""}`,
  });
  return meeting;
}

async function ownMeeting(userId: string, id: string) {
  const m = await db.meeting.findUnique({ where: { id } });
  if (!m || m.userId !== userId) throw new OutlookError("Meeting not found");
  return m;
}

export async function updateMeeting(userId: string, id: string, m: MeetingInput) {
  const before = await ownMeeting(userId, id);
  if (!before.isOrganizer) throw new OutlookError("Only the organizer can edit this meeting");
  const token = await accessToken(userId);
  const e = await graphFetch<GraphEvent>(token, `/me/events/${encodeURIComponent(before.outlookEventId)}?$select=${SELECT}`, {
    method: "PATCH", body: JSON.stringify(eventBody(m)),
  });
  const meeting = await db.meeting.update({ where: { id }, data: { ...toRow(e), opportunityId: m.opportunityId || null } });
  await audit(db, { userId, action: "meeting.update", entityType: "meeting", entityId: id, summary: `Updated meeting "${meeting.subject}"` });
  return meeting;
}

/** Organizer: cancels and notifies attendees. Attendee: removes it from their calendar. */
export async function cancelMeeting(userId: string, id: string) {
  const m = await ownMeeting(userId, id);
  const token = await accessToken(userId);
  const path = `/me/events/${encodeURIComponent(m.outlookEventId)}`;
  try {
    if (m.isOrganizer) await graphFetch(token, `${path}/cancel`, { method: "POST", body: JSON.stringify({ comment: "" }) });
    else await graphFetch(token, path, { method: "DELETE" });
  } catch (e) {
    // Already gone in Outlook: just drop the mirror.
    if (!(e instanceof OutlookError && /not found/i.test(e.message))) throw e;
  }
  await db.meeting.delete({ where: { id } });
  await audit(db, { userId, action: "meeting.cancel", entityType: "meeting", entityId: id, summary: `${m.isOrganizer ? "Cancelled" : "Removed"} meeting "${m.subject}"` });
}

export async function linkMeeting(userId: string, id: string, opportunityId: string | null) {
  await ownMeeting(userId, id);
  return db.meeting.update({ where: { id }, data: { opportunityId } });
}

export async function listMeetings(userId: string) {
  return db.meeting.findMany({
    where: { userId },
    orderBy: { start: "asc" },
    include: { opportunity: { select: { id: true, number: true, title: true } } },
  });
}

export async function listOpportunityMeetings(opportunityId: string) {
  return db.meeting.findMany({
    where: { opportunityId },
    orderBy: { start: "desc" },
    include: { user: { select: { name: true } } },
  });
}
