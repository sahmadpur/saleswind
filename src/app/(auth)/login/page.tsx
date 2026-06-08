import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  { icon: "monitoring", title: "Track every deal", body: "A live pipeline from prospect to project." },
  { icon: "domain", title: "Know your accounts", body: "Every company and contact in one place." },
  { icon: "bar_chart", title: "Report with confidence", body: "Pipeline revenue and gross profit at a glance." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  async function login(formData: FormData) {
    "use server";
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — desktop only */}
      <section className="relative hidden overflow-hidden bg-gblue-dark px-14 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50rem 38rem at 12% -10%, rgba(255,255,255,0.18), transparent 60%)," +
              "radial-gradient(42rem 34rem at 110% 20%, rgba(138,48,206,0.35), transparent 55%)," +
              "radial-gradient(46rem 36rem at 70% 120%, rgba(30,142,62,0.30), transparent 55%)",
          }}
        />
        <div className="g-rise relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur" aria-hidden>
            <span className="material-symbols-outlined fill" style={{ fontSize: 22 }}>air</span>
          </span>
          <span className="text-xl font-medium tracking-tight">Saleswind</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="g-rise text-[2.5rem] font-normal leading-[1.1] tracking-tight" style={{ animationDelay: "60ms" }}>
            Your whole pipeline, in one place.
          </h1>
          <p className="g-rise mt-4 text-base text-white/80" style={{ animationDelay: "120ms" }}>
            Saleswind keeps prospects, deals and reporting moving — so your team always knows what to do next.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                className="g-rise flex items-start gap-4"
                style={{ animationDelay: `${180 + i * 70}ms` }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{f.icon}</span>
                </span>
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-sm text-white/70">{f.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="g-rise relative text-xs text-white/55" style={{ animationDelay: "440ms" }}>
          © Saleswind — sales pipeline, accounts and reporting.
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center overflow-hidden bg-gbg px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background:
              "radial-gradient(60rem 40rem at 15% -10%, rgba(26,115,232,0.10), transparent 60%)," +
              "radial-gradient(50rem 35rem at 110% 20%, rgba(217,48,37,0.08), transparent 55%)",
          }}
        />
        <form
          action={login}
          className="g-rise relative w-full max-w-[24rem] rounded-[28px] border border-gline-2 bg-gsurface px-9 py-11 shadow-g1"
        >
          <div className="mb-7 flex flex-col items-center text-center">
            <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gblue text-white shadow-g1 lg:hidden">
              <span className="material-symbols-outlined fill" style={{ fontSize: 26 }}>air</span>
            </span>
            <h2 className="text-2xl font-normal text-gink">Sign in</h2>
            <p className="mt-1.5 text-sm text-ggrey">to continue to Saleswind</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-gred-50 px-4 py-2.5 text-sm text-gred">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              Invalid email or password.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-ggrey">Email</label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ggrey">Password</label>
              <Input id="password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <span className="text-xs text-ggrey-2">Use your team credentials</span>
            <Button type="submit">Sign in</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
