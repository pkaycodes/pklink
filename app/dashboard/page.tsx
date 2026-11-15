import Link from "next/link";
import {
  ArrowUpRight,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Layers,
  Link2,
  Plus,
  QrCode,
  Type,
  Video,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge, buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getOwner } from "@/lib/auth";
import { listCreations } from "@/lib/creations";
import type { ContentType } from "@/lib/types";
import { ACCESS_LABELS, CONTENT_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const CONTENT_ICONS: Record<ContentType, typeof Type> = {
  text: Type,
  gallery: ImageIcon,
  video: Video,
  document: FileText,
  link: Link2,
  mixed: Layers,
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const owner = user ? { userId: user.id, guestToken: null } : await getOwner();
  const creations = await listCreations(owner);

  const totalScans = creations.reduce((sum, creation) => sum + Number(creation.scan_count ?? 0), 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[36px] leading-tight tracking-tight text-ink sm:text-[42px]">
              Your pages
            </h1>
            <p className="mt-2 text-sm text-muted">
              {creations.length === 0
                ? "Everything you publish will show up here, with its QR code and scans."
                : `${creations.length} page${creations.length === 1 ? "" : "s"} · ${totalScans} scan${
                    totalScans === 1 ? "" : "s"
                  } recorded`}
            </p>
          </div>
          <Link href="/create" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" /> New page
          </Link>
        </div>

        {!user ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-accent/20 bg-accent-soft/60 px-4 py-3">
            <span className="text-[13px] font-medium text-accent-ink">
              You&apos;re working as a guest.
            </span>
            <span className="text-[13px] text-accent-ink/80">
              Your pages live in this browser. Create an account to keep them everywhere.
            </span>
            <Link
              href="/signup"
              className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-accent-ink underline underline-offset-4"
            >
              Save my pages <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        {creations.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-line-strong bg-white/60 px-6 py-20 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-shell text-ink">
              <QrCode className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-serif text-2xl tracking-tight">No pages yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
              Start with a message. Add photos, a video or a document, then publish — you&apos;ll
              have a QR code in seconds.
            </p>
            <Link href="/create" className={buttonClass("primary", "md", "mt-6")}>
              Create your first page
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-2.5">
            {creations.map((creation) => {
              const Icon = CONTENT_ICONS[creation.content_type] ?? Layers;
              return (
                <Link
                  key={creation.id}
                  href={`/dashboard/${creation.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-4 transition-colors hover:border-line-strong"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-shell text-ink-soft transition-colors group-hover:bg-accent-soft group-hover:text-accent-ink">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15px] font-medium text-ink">
                        {creation.title}
                      </h2>
                      {creation.published ? null : (
                        <Badge tone="warning">
                          <EyeOff className="h-3 w-3" /> Off
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      /p/{creation.slug} · {CONTENT_LABELS[creation.content_type]} · updated{" "}
                      {timeAgo(Number(creation.updated_at))}
                    </p>
                  </div>

                  <div className="hidden items-center gap-3 sm:flex">
                    <span className="text-[12px] tabular-nums text-muted">
                      {Number(creation.scan_count)} scan
                      {Number(creation.scan_count) === 1 ? "" : "s"}
                    </span>
                    <Badge
                      tone={
                        creation.access_type === "public"
                          ? "neutral"
                          : creation.access_type === "password"
                            ? "accent"
                            : "neutral"
                      }
                    >
                      {ACCESS_LABELS[creation.access_type]}
                    </Badge>
                  </div>

                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
