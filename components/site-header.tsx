import Link from "next/link";
import { Brand } from "./brand";
import { buttonClass } from "./ui";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions";

export async function SiteHeader({ variant = "app" }: { variant?: "app" | "landing" }) {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Brand />

        <nav className="flex items-center gap-1.5 sm:gap-3">
          {variant === "landing" ? (
            <>
              <Link
                href="#how"
                className="hidden rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:block"
              >
                How it works
              </Link>
              <Link
                href="#privacy"
                className="hidden rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:block"
              >
                Privacy
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Dashboard
            </Link>
          )}

          {user ? (
            <>
              <Link href="/create" className={buttonClass("primary", "sm")}>
                Create
              </Link>
              <span className="hidden max-w-[160px] truncate rounded-full border border-line bg-white px-3 py-1.5 text-[12px] text-muted sm:block">
                {user.email}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full px-2.5 py-2 text-[13px] text-muted transition-colors hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : variant === "landing" ? (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink sm:block"
              >
                Sign in
              </Link>
              <Link href="/create" className={buttonClass("primary", "sm")}>
                Create for free
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link href="/create" className={buttonClass("primary", "sm")}>
                Create
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
