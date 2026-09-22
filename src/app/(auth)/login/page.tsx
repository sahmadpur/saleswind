import { isBlockedLogin, microsoftLoginEnabled, signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  { icon: "monitoring", title: "Pipeline", body: "Move deals from prospect to project." },
  { icon: "domain", title: "Accounts", body: "Every company and contact in one place." },
  { icon: "dashboard", title: "Dashboard", body: "Predicted revenue and gross profit, live." },
];

const ERRORS: Record<string, string> = {
  blocked: "Your account is blocked. Contact your admin.",
  "1": "Email or password is incorrect.",
  AccessDenied: "This Microsoft account can't sign in to Saleswind. Use your company Office account.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; password?: string }> }) {
  const { error, password } = await searchParams;
  const microsoft = microsoftLoginEnabled();
  // With Microsoft sign-in on, the password form is only a hidden fallback for admins (/login?password=1).
  const showPassword = !microsoft || !!password;
  async function microsoftLogin() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo: "/opportunities" });
  }
  async function login(formData: FormData) {
    "use server";
    if (await isBlockedLogin(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""))) {
      redirect("/login?error=blocked");
    }
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/opportunities",
      });
    } catch (e) {
      // signIn signals a successful login by throwing a NEXT_REDIRECT error.
      // Re-throw it so the redirect propagates; only genuine auth failures
      // should fall through to the error redirect below.
      if (isRedirectError(e)) throw e;
      redirect("/login?error=1");
    }
  }
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      {/* Brand panel — desktop only */}
      <section className="hidden bg-gink px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gblue" aria-hidden>
            <span className="material-symbols-outlined fill" style={{ fontSize: 20 }}>air</span>
          </span>
          <span className="text-lg font-semibold tracking-[-0.01em]">Saleswind</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.02em]">
            Every deal, from first call to signed contract.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/65">
            Saleswind keeps your prospects, deals and revenue forecast in one pipeline, so the team always knows what moves next.
          </p>
          <ul className="mt-10 space-y-3 text-sm text-white/75">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gblue-200" style={{ fontSize: 20 }}>{f.icon}</span>
                <span><span className="font-medium text-white">{f.title}.</span> {f.body}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40">Saleswind — sales pipeline, accounts and dashboards.</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-gbg px-4 py-10">
        <div className="w-full max-w-[22rem]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gblue text-white" aria-hidden>
              <span className="material-symbols-outlined fill" style={{ fontSize: 20 }}>air</span>
            </span>
            <span className="text-lg font-semibold tracking-[-0.01em] text-gink">Saleswind</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-gink">Sign in</h2>
          <p className="mt-1 text-sm text-ggrey">Use your company Office 365 (Microsoft) account.</p>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-md bg-gred-50 px-3 py-2.5 text-sm text-gred">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {ERRORS[error] ?? "Sign-in failed. Try again."}
            </div>
          )}

          {/* Always shown so people know Office sign-in is the way in; disabled until the Microsoft app is configured. */}
          <form action={microsoftLogin}>
            <button
              type="submit"
              disabled={!microsoft}
              className="g-press mt-7 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-gline bg-gsurface text-sm font-semibold text-gink shadow-g1 transition-colors hover:bg-ghover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-gsurface"
            >
              <svg aria-hidden viewBox="0 0 21 21" width="20" height="20">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Sign in with Office 365
            </button>
          </form>
          {!microsoft && (
            <p className="mt-2 text-center text-xs text-ggrey">Office 365 sign-in is being set up. Use your email and password for now.</p>
          )}

          {showPassword && (
            <div className="mt-6 flex items-center gap-3 text-xs text-ggrey-2">
              <span className="h-px flex-1 bg-gline" />
              or with password
              <span className="h-px flex-1 bg-gline" />
            </div>
          )}

          {showPassword && (
            <form action={login}>
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-ggrey">Email</label>
                  <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ggrey">Password</label>
                  <Input id="password" name="password" type="password" autoComplete="current-password" required />
                </div>
              </div>

              <Button type="submit" className="mt-6 w-full">Sign in</Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
