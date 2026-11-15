import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 place-items-center rounded-[9px] bg-ink text-paper",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.6" fill="currentColor" />
        <rect x="12" y="2.5" width="5.5" height="5.5" rx="1.6" fill="currentColor" opacity="0.55" />
        <rect x="2.5" y="12" width="5.5" height="5.5" rx="1.6" fill="currentColor" opacity="0.55" />
        <rect x="12" y="12" width="2.4" height="2.4" rx="0.8" fill="currentColor" />
        <rect x="15.1" y="15.1" width="2.4" height="2.4" rx="0.8" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">PKLink</span>
    </Link>
  );
}
