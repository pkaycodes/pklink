import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { QrPanel } from "@/components/qr-panel";
import { CopyButton } from "@/components/copy-button";
import { DeleteCreationButton, PublishToggle } from "@/components/creation-controls";
import { Badge, Card, buttonClass } from "@/components/ui";
import { getCurrentUser, getOwner } from "@/lib/auth";
import { getCreationForOwner } from "@/lib/creations";
import { getScanStats } from "@/lib/analytics";
import { getOrigin, pageUrl } from "@/lib/urls";
import { ACCESS_LABELS, ACCESS_DESCRIPTIONS, CONTENT_LABELS } from "@/lib/types";
import { countryLabel, deviceLabel, formatDate, formatDateTime, timeAgo } from "@/lib/utils";

export default async function CreationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { created, saved } = await searchParams;
  const user = await getCurrentUser();
  const owner = user ? { userId: user.id, guestToken: null } : await getOwner();
  const creation = await getCreationForOwner(id, owner);

  if (!creation) notFound();

  const origin = await getOrigin();
  const shareUrl = pageUrl(origin, creation.slug);
  const stats = await getScanStats(creation.id);
  const maxDaily = Math.max(1, ...stats.daily.map((entry) => entry.count));
  const blockCount = creation.parsedBlocks.length;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All pages
        </Link>

        {created ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Your page is live. Scan the QR code below, or send the link to anyone — no account
              needed on their side.
            </span>
          </div>
        ) : null}

        {saved ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span>Changes saved. The link and QR code stay exactly the same.</span>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{CONTENT_LABELS[creation.content_type]}</Badge>
              <Badge tone={creation.access_type === "password" ? "accent" : "neutral"}>
                {ACCESS_LABELS[creation.access_type]}
              </Badge>
              {creation.published ? (
                <Badge tone="success">Live</Badge>
              ) : (
                <Badge tone="warning">Disabled</Badge>
              )}
            </div>
            <h1 className="mt-3 font-serif text-[32px] leading-tight tracking-tight text-ink sm:text-[40px]">
              {creation.title}
            </h1>
            {creation.subtitle ? (
              <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">
                {creation.subtitle}
              </p>
            ) : null}
            <p className="mt-2 text-[12px] text-muted">
              /p/{creation.slug} · updated {timeAgo(Number(creation.updated_at))} · {blockCount}{" "}
              block{blockCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/p/${creation.slug}`}
              target="_blank"
              className={buttonClass("secondary", "sm")}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open page
            </Link>
            <Link href={`/dashboard/${creation.id}/edit`} className={buttonClass("secondary", "sm")}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            <Link href={`/dashboard/${creation.id}/qr`} className={buttonClass("primary", "sm")}>
              <QrCode className="h-3.5 w-3.5" /> QR code
            </Link>
          </div>
        </div>

        {!user ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-[13px] text-accent-ink">
            <span className="font-medium">This page belongs to this browser.</span>
            <span className="text-accent-ink/80">
              Create a free account to keep it and manage it from anywhere.
            </span>
            <Link href="/signup" className="ml-auto font-medium underline underline-offset-4">
              Create account
            </Link>
          </div>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Share
                </h2>
                <CopyButton value={shareUrl} label="Copy link" />
              </div>
              <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-xl border border-line bg-paper px-3.5 py-2.5">
                <Globe className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate font-mono text-[12.5px] text-ink-soft">{shareUrl}</span>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                This link is permanent for as long as the page exists. Editing the page keeps the
                same link, so printed QR codes never need to change.
              </p>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <BarChart3 className="h-3.5 w-3.5" /> Scans
                </h2>
                <span className="text-[11px] text-muted">Last 14 days</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-line bg-paper px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Total</p>
                  <p className="mt-1 font-serif text-2xl tracking-tight">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-line bg-paper px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Unique</p>
                  <p className="mt-1 font-serif text-2xl tracking-tight">{stats.unique}</p>
                </div>
                <div className="rounded-2xl border border-line bg-paper px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Last scan</p>
                  <p className="mt-1.5 text-[13px] font-medium text-ink">
                    {stats.lastScanAt ? timeAgo(stats.lastScanAt) : "—"}
                  </p>
                </div>
              </div>

              {stats.total === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-ink-soft">No scans yet</p>
                  <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-muted">
                    Download the QR code or share the link. Opens are recorded here automatically —
                    your own visits are not counted.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <div className="flex h-24 items-end gap-1">
                      {stats.daily.map((entry) => (
                        <div
                          key={entry.day}
                          title={`${entry.day}: ${entry.count} scan${entry.count === 1 ? "" : "s"}`}
                          className="flex-1 rounded-t-[3px] bg-accent/25 transition-colors hover:bg-accent/60"
                          style={{
                            height: `${Math.max(3, (entry.count / maxDaily) * 100)}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-muted">
                      <span>13 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted">Devices</p>
                      <div className="mt-2 space-y-2">
                        {stats.devices.map((device) => (
                          <div key={device.device}>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                                <Smartphone className="h-3 w-3 text-muted" />
                                {deviceLabel(device.device)}
                              </span>
                              <span className="tabular-nums text-muted">{device.count}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-shell">
                              <div
                                className="h-full rounded-full bg-ink/70"
                                style={{ width: `${(device.count / stats.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted">Regions</p>
                      <div className="mt-2 space-y-1.5">
                        {stats.countries.length === 0 ? (
                          <p className="text-[12px] text-muted">Not available for these scans.</p>
                        ) : (
                          stats.countries.map((country) => (
                            <div
                              key={country.country}
                              className="flex items-center justify-between text-[12px]"
                            >
                              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                                <MapPin className="h-3 w-3 text-muted" />
                                {countryLabel(country.country)}
                              </span>
                              <span className="tabular-nums text-muted">{country.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted">Recent scans</p>
                    <div className="mt-2 divide-y divide-line/70">
                      {stats.recent.map((scan) => (
                        <div
                          key={scan.id}
                          className="flex items-center justify-between gap-3 py-2 text-[12px]"
                        >
                          <span className="inline-flex items-center gap-1.5 text-ink-soft">
                            <Clock className="h-3 w-3 text-muted" />
                            {formatDateTime(Number(scan.created_at))}
                          </span>
                          <span className="text-muted">
                            {deviceLabel(scan.device)} · {countryLabel(scan.country)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <QrCode className="h-3.5 w-3.5" /> QR code
                </h2>
                <Link
                  href={`/dashboard/${creation.id}/qr`}
                  className="text-[12px] text-accent-ink hover:underline"
                >
                  Full size
                </Link>
              </div>
              <div className="mt-4">
                <QrPanel
                  creationId={creation.id}
                  url={shareUrl}
                  initial={creation.qrSettings}
                  fileName={creation.slug}
                />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
                Manage
              </h2>
              <div className="mt-3 space-y-3">
                <PublishToggle id={creation.id} published={Boolean(creation.published)} />
                <p className="text-[12px] leading-relaxed text-muted">
                  Disabling stops the page and QR code from opening without deleting anything.
                </p>
                <div className="border-t border-line pt-3">
                  <DeleteCreationButton id={creation.id} title={creation.title} />
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">
                    Deleting frees the link permanently — scans of the printed code will 404.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
                <ShieldCheck className="h-3.5 w-3.5" /> Details
              </h2>
              <dl className="mt-3 space-y-2.5 text-[12.5px]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted">Access</dt>
                  <dd className="text-right font-medium text-ink">
                    {ACCESS_LABELS[creation.access_type]}
                  </dd>
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted">
                  {ACCESS_DESCRIPTIONS[creation.access_type]}
                </p>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                  <dt className="text-muted">Created</dt>
                  <dd className="text-ink-soft">{formatDate(Number(creation.created_at))}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Expires</dt>
                  <dd className="text-ink-soft">
                    {creation.expires_at ? formatDate(Number(creation.expires_at)) : "Never"}
                  </dd>
                </div>
                <Link
                  href={`/dashboard/${creation.id}/edit`}
                  className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-ink hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Change access settings
                </Link>
              </dl>
            </Card>

            <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-white/60 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
              <p className="text-[12px] leading-relaxed text-muted">
                Tip: print the QR code at 2 cm or larger for posters, and test the scan with the
                phone you actually expect visitors to use.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
