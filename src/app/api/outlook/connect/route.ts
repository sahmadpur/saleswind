import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { authUrl, outlookConfigured } from "@/services/outlook-service";

const STATE_COOKIE = "outlook_oauth_state";

/** Start Microsoft sign-in. The state cookie ties the callback to this browser (CSRF). */
export async function GET(req: Request) {
  await requireUser();
  const origin = new URL(req.url).origin;
  if (!outlookConfigured()) return NextResponse.redirect(new URL("/meetings", process.env.AUTH_URL || origin));
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authUrl(state, origin));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: origin.startsWith("https") || !!process.env.AUTH_URL?.startsWith("https"), sameSite: "lax", path: "/api/outlook", maxAge: 600 });
  return res;
}
