import { signIn } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

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
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form action={login} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-medium text-neutral-900">Sign in to Saleswind</h1>
        {error && <p className="mb-4 text-sm text-red-600">Invalid email or password.</p>}
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="mb-6 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
