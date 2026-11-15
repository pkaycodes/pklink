import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button, Field, Input } from "@/components/ui";
import { signUpAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create an account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="grain flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-5">
        <Brand />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[400px] rise">
          <h1 className="font-serif text-[34px] leading-tight tracking-tight text-ink">
            Keep every page
          </h1>
          <p className="mt-2 text-sm text-muted">
            An account keeps your pages, QR designs and scan history in one place.
          </p>

          {error ? (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form
            action={signUpAction}
            className="mt-6 space-y-4 rounded-3xl border border-line bg-white p-6"
          >
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" htmlFor="password" hint="At least 8 characters.">
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>

          <ul className="mt-5 space-y-1.5">
            {[
              "Pages you create here are saved to your account",
              "Unlimited pages, QR downloads and analytics",
              "Change access, password or disable a page anytime",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12.5px] text-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-center text-[13px] text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
