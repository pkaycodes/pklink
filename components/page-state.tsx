import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { buttonClass } from "./ui";

export function PageState({
  icon,
  title,
  copy,
  children,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-5">
          <Brand />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center rise">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white text-ink-soft">
            {icon}
          </span>
          <h1 className="mt-5 font-serif text-[30px] leading-tight tracking-tight text-ink">
            {title}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{copy}</p>
          {children}
        </div>
      </main>

      <footer className="pb-8 text-center text-[11px] text-muted">
        <Link href="/" className="hover:text-ink">
          PKLink
        </Link>
      </footer>
    </div>
  );
}

export function PageStateLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={buttonClass("primary", "sm", "mt-6")}>
      {label}
    </Link>
  );
}
