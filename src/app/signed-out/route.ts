import { signOut } from "@/lib/auth";

/** Clears the session cookie of a blocked or deleted user (see requireUser). */
export async function GET() {
  await signOut({ redirectTo: "/login?error=blocked" });
}
