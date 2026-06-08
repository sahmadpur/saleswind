import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gbg px-4 py-10">
      {/* Atmospheric Google-colour mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, rgba(26,115,232,0.10), transparent 60%)," +
            "radial-gradient(50rem 35rem at 110% 20%, rgba(217,48,37,0.08), transparent 55%)," +
            "radial-gradient(45rem 35rem at 80% 120%, rgba(30,142,62,0.08), transparent 55%)",
        }}
      />

      <form
        action={login}
        className="g-rise relative w-full max-w-[26rem] rounded-[28px] border border-gline-2 bg-gsurface px-10 py-12 shadow-g1"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gblue text-white shadow-g1">
            <span className="material-symbols-outlined fill" style={{ fontSize: 26 }}>air</span>
          </span>
          <h1 className="text-2xl font-normal text-gink">Sign in</h1>
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
    </main>
  );
}
