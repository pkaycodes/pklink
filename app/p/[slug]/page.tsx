import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff, KeyRound, Lock, ShieldAlert } from "lucide-react";
import { ArticleBlocks } from "@/components/article-blocks";
import { Brand, BrandMark } from "@/components/brand";
import { PageState, PageStateLink } from "@/components/page-state";
import { Button, Input, buttonClass } from "@/components/ui";
import {
  getCreationBlocks,
  getCreationGate,
  hydrateBlocks,
  isOwnerOf,
  isUnlocked,
} from "@/lib/creations";
import { getOwner } from "@/lib/auth";
import { recordView } from "@/lib/analytics";
import { unlockAction } from "@/app/actions";
import { formatDate } from "@/lib/utils";
import { CONTENT_LABELS } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gate = await getCreationGate(slug);

  if (!gate || !gate.published) {
    return { title: "Page unavailable", robots: { index: false, follow: false } };
  }

  const isPublic = gate.access_type === "public";

  return {
    title: gate.title,
    description: isPublic
      ? gate.subtitle || "A page shared with PKLink."
      : "Open this page to see what was shared.",
    robots: isPublic ? undefined : { index: false, follow: false },
    openGraph: {
      title: gate.title,
      description: isPublic ? gate.subtitle || "A page shared with PKLink." : undefined,
      type: "article",
    },
  };
}

export default async function PublicCreationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const gate = await getCreationGate(slug);

  if (!gate) notFound();

  const owner = await getOwner();
  const ownerView = isOwnerOf(gate, owner);
  const now = Date.now();

  if (!gate.published) {
    return (
      <PageState
        icon={<EyeOff className="h-5 w-5" />}
        title="This page is turned off"
        copy="The creator has paused this page. If that's you, switch it back on from your dashboard and the same link starts working again."
      >
        {ownerView ? (
          <PageStateLink href={`/dashboard/${gate.id}`} label="Manage this page" />
        ) : (
          <PageStateLink href="/create" label="Create your own page" />
        )}
      </PageState>
    );
  }

  if (gate.expires_at && Number(gate.expires_at) < now && !ownerView) {
    return (
      <PageState
        icon={<ShieldAlert className="h-5 w-5" />}
        title="This page has expired"
        copy="The creator set an end date for this page, and it has passed. The QR code no longer opens it."
      >
        <PageStateLink href="/create" label="Create your own page" />
      </PageState>
    );
  }

  if (gate.access_type === "private" && !ownerView) {
    return (
      <PageState
        icon={<Lock className="h-5 w-5" />}
        title="This page is private"
        copy="Only the creator can open this page while signed in. If someone shared the link with you, ask them for a public or password-protected version."
      >
        <PageStateLink href="/create" label="Create your own page" />
      </PageState>
    );
  }

  if (gate.access_type === "password" && !ownerView && !(await isUnlocked(gate.id))) {
    return (
      <PageState
        icon={<KeyRound className="h-5 w-5" />}
        title="This page is protected"
        copy={`Enter the password to open “${gate.title}”.`}
      >
        <form action={unlockAction} className="mt-6 space-y-2.5 text-left">
          <input type="hidden" name="slug" value={gate.slug} />
          <Input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Page password"
            aria-label="Page password"
          />
          {error ? (
            <p className="text-[12.5px] text-danger">That password didn&apos;t match. Try again.</p>
          ) : null}
          <Button type="submit" className="w-full">
            Unlock page
          </Button>
        </form>
        <p className="mt-4 text-[11.5px] text-muted">
          The password is checked on the server, so the page can&apos;t be opened by inspecting the
          link.
        </p>
      </PageState>
    );
  }

  if (!ownerView) {
    await recordView(gate.id);
  }

  const blocks = await hydrateBlocks(await getCreationBlocks(gate.slug));

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Brand />
          <Link
            href="/create"
            className="text-[11.5px] text-muted transition-colors hover:text-ink"
          >
            Create your own
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-16">
        <article className="rise">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] uppercase tracking-[0.16em] text-muted">
            <span>{CONTENT_LABELS[gate.content_type]}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(Number(gate.updated_at))}</span>
            {gate.access_type === "unlisted" ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Unlisted
                </span>
              </>
            ) : null}
          </div>

          <h1 className="mt-4 font-serif text-[38px] leading-[1.06] tracking-[-0.015em] text-ink sm:text-[52px]">
            {gate.title}
          </h1>

          {gate.subtitle ? (
            <p className="mt-4 text-[17px] leading-relaxed text-muted sm:text-[19px]">
              {gate.subtitle}
            </p>
          ) : null}

          <div className="my-9 h-px bg-line" />

          <ArticleBlocks blocks={blocks} />
        </article>

        <div className="mt-14 border-t border-line pt-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-line bg-white p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-serif text-[20px] tracking-tight text-ink">
                Make a page like this
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                Text, photos, video and files — behind one QR code. Free, no account needed.
              </p>
            </div>
            <Link href="/create" className={buttonClass("primary", "sm")}>
              Create for free
            </Link>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted">
            <BrandMark className="h-4 w-4 rounded-[6px]" /> Shared with PKLink
          </p>
        </div>
      </main>
    </div>
  );
}
