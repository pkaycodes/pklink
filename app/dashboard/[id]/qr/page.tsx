import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Brand } from "@/components/brand";
import { QrPanel } from "@/components/qr-panel";
import { CopyButton } from "@/components/copy-button";
import { getCurrentUser, getOwner } from "@/lib/auth";
import { getCreationForOwner } from "@/lib/creations";
import { getOrigin, pageUrl } from "@/lib/urls";

export const metadata = { title: "QR code" };

export default async function QrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const owner = user ? { userId: user.id, guestToken: null } : await getOwner();
  const creation = await getCreationForOwner(id, owner);

  if (!creation) notFound();

  const origin = await getOrigin();
  const shareUrl = pageUrl(origin, creation.slug);

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Brand />
          <Link
            href={`/dashboard/${creation.id}`}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to page
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
        <div className="no-print">
          <h1 className="font-serif text-[32px] leading-tight tracking-tight text-ink sm:text-[38px]">
            {creation.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-muted">
            <span>Scan it, print it, stick it on a wall.</span>
            <CopyButton value={shareUrl} label="Copy link" variant="ghost" />
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8">
          <QrPanel
            creationId={creation.id}
            url={shareUrl}
            initial={creation.qrSettings}
            fileName={creation.slug}
            variant="page"
          />
        </div>

        <div className="no-print mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print saves a clean sheet with just the code.
          </span>
          <span>PNG is best for screens and docs. SVG scales to any print size.</span>
        </div>
      </main>
    </div>
  );
}
