import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { connectOutlook, OutlookError } from "@/services/outlook-service";

const STATE_COOKIE = "outlook_oauth_state";

/** Microsoft redirects here after sign-in with ?code&state (or ?error). */
export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const base = process.env.AUTH_URL || url.origin;
  const back = (params: Record<string, string>) => {
    const res = NextResponse.redirect(new URL(`/meetings?${new URLSearchParams(params)}`, base));
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/outlook" });
    return res;
  };

  const expected = req.headers.get("cookie")?.match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1];
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return back({ outlook: "denied" });
  if (!code || !state || !expected || state !== expected) return back({ outlook: "invalid" });

  try {
    await connectOutlook(user.id, code, url.origin);
  } catch (e) {
    if (e instanceof OutlookError) return back({ outlook: "error", message: e.message });
    throw e;
  }
  return back({ outlook: "connected" });
}
