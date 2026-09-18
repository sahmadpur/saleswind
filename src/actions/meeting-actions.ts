"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { zonedToUtc } from "@/lib/format";
import type { FormState } from "@/lib/action-state";
import { formValues } from "@/lib/action-state";
import {
  cancelMeeting, createMeeting, disconnectOutlook, linkMeeting, OutlookError, syncMeetings, updateMeeting, type MeetingInput,
} from "@/services/outlook-service";

const meetingSchema = z
  .object({
    subject: z.string().trim().min(1, "Subject is required"),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a start time"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick an end time"),
    location: z.string().trim().optional(),
    attendees: z.string().optional(),
    online: z.string().optional(),
    notes: z.string().optional(),
    opportunityId: z.string().optional(),
  })
  .refine((m) => m.end > m.start, { message: "End must be after start", path: ["end"] });

const EMAIL = z.string().email();

function toInput(fd: FormData): { input?: MeetingInput; error?: FormState["error"] } {
  const parsed = meetingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const m = parsed.data;
  const attendees = [...new Set((m.attendees ?? "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
  const bad = attendees.filter((a) => !EMAIL.safeParse(a).success);
  if (bad.length) return { error: { attendees: [`Not an email: ${bad.join(", ")}`] } };
  return {
    input: {
      subject: m.subject, start: zonedToUtc(m.start), end: zonedToUtc(m.end), location: m.location || undefined,
      attendees, online: m.online === "on", notes: m.notes || undefined, opportunityId: m.opportunityId || null,
    },
  };
}

function revalidate(opportunityId?: string | null) {
  revalidatePath("/meetings");
  if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`);
}

export async function saveMeetingAction(id: string | null, _prev: unknown, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(fd);
  const { input, error } = toInput(fd);
  if (!input) return { error, values };
  try {
    if (id) await updateMeeting(user.id, id, input);
    else await createMeeting(user.id, input);
  } catch (e) {
    if (e instanceof OutlookError) return { error: { _form: [e.message] }, values };
    throw e;
  }
  revalidate(input.opportunityId);
  return { ok: true };
}

export async function cancelMeetingAction(id: string, opportunityId: string | null): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await cancelMeeting(user.id, id);
  } catch (e) {
    if (e instanceof OutlookError) return { error: e.message };
    throw e;
  }
  revalidate(opportunityId);
  return {};
}

export async function linkMeetingAction(id: string, opportunityId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await linkMeeting(user.id, id, opportunityId || null);
  } catch (e) {
    if (e instanceof OutlookError) return { error: e.message };
    throw e;
  }
  // Old and new opportunity pages both change.
  revalidatePath("/meetings");
  revalidatePath("/opportunities/[id]", "page");
  return {};
}

export async function syncMeetingsAction(): Promise<{ error?: string; count?: number }> {
  const user = await requireUser();
  const res = await syncMeetings(user.id);
  revalidatePath("/meetings");
  return res;
}

export async function disconnectOutlookAction() {
  const user = await requireUser();
  await disconnectOutlook(user.id);
  revalidatePath("/meetings");
}
