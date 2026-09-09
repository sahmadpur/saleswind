import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  { icon: "monitoring", title: "Pipeline", body: "Move deals from prospect to project." },
  { icon: "domain", title: "Accounts", body: "Every company and contact in one place." },
  { icon: "bar_chart", title: "Reports", body: "Predicted revenue and gross profit, live." },
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

        <p className="text-xs text-white/40">Saleswind — sales pipeline, accounts and reporting.</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-gbg px-4 py-10">
        <form action={login} className="w-full max-w-[22rem]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gblue text-white" aria-hidden>
              <span className="material-symbols-outlined fill" style={{ fontSize: 20 }}>air</span>
            </span>
            <span className="text-lg font-semibold tracking-[-0.01em] text-gink">Saleswind</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-gink">Sign in</h2>
          <p className="mt-1 text-sm text-ggrey">Use the email and password your admin gave you.</p>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-md bg-gred-50 px-3 py-2.5 text-sm text-gred">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              Email or password is incorrect.
            </div>
          )}

          <div className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-ggrey">Email</label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ggrey">Password</label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
          </div>

          <Button type="submit" className="mt-7 w-full">Sign in</Button>
        </form>
      </section>
    </main>
  );
}
