import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  EyeOff,
  FileText,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Lock,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
  Type,
  Video,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BrandMark } from "@/components/brand";
import { SectionLabel, buttonClass } from "@/components/ui";
import { getOrigin } from "@/lib/urls";

const CONTENT_TYPES = [
  { icon: Type, label: "Text" },
  { icon: ImageIcon, label: "Photos" },
  { icon: Video, label: "Video" },
  { icon: FileText, label: "Documents" },
  { icon: Link2, label: "Links" },
];

const STEPS = [
  {
    title: "Create anything",
    copy: "Write a message, drop in photos and video, attach a PDF, add a link. Mix them in any order.",
  },
  {
    title: "Publish in one click",
    copy: "Your page gets a permanent, private link and a QR code the moment you hit publish.",
  },
  {
    title: "Share the scan",
    copy: "Print it, download the PNG or SVG, or send the link. No app required on the other end.",
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "An editor that gets out of the way",
    copy: "Title, subtitle, text and media blocks you can rearrange. A live preview shows exactly what visitors will see.",
  },
  {
    icon: Palette,
    title: "QR codes worth printing",
    copy: "Choose the colors, drop in your logo, then export a crisp PNG or SVG — or print it straight from the page.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy that actually locks",
    copy: "Public, unlisted, password-protected or private. Enforced on the server, not just hidden in the interface.",
  },
  {
    icon: BarChart3,
    title: "Quiet, useful analytics",
    copy: "See total scans, unique visitors, devices and approximate regions. No invasive tracking, no third-party pixels.",
  },
];

const ACCESS_MODES = [
  {
    icon: Globe,
    label: "Public",
    copy: "Anyone with the code can open it. Great for menus, posters and sharing in the open.",
  },
  {
    icon: EyeOff,
    label: "Unlisted",
    copy: "Works from the link, but search engines are asked to stay out.",
  },
  {
    icon: KeyRound,
    label: "Password",
    copy: "A shared secret in front of the page. Verified server-side on every request.",
  },
  {
    icon: Lock,
    label: "Private",
    copy: "Only visible to you while signed in. The QR code stays in your possession.",
  },
];

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const origin = await getOrigin();
  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(`${origin}/create`, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "H",
      color: { dark: "#141416", light: "#ffffff" },
    });
  } catch {
    qrSvg = "";
  }

  return (
    <div className="min-h-screen">
      <SiteHeader variant="landing" />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent-soft/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 md:grid-cols-[1.05fr_0.95fr] md:pb-28 md:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 text-[11.5px] font-medium text-ink-soft">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                One page. One code. Any content.
              </span>

              <h1 className="mt-6 font-serif text-[44px] leading-[1.03] tracking-[-0.02em] text-ink sm:text-6xl md:text-[66px]">
                Anything you want to share.{" "}
                <span className="text-muted">One scan away.</span>
              </h1>

              <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink-soft/90">
                Turn messages, photos, videos, documents and memories into beautiful pages that
                anyone can access by scanning a QR code.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/create" className={buttonClass("primary", "lg")}>
                  Create for Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#how" className={buttonClass("secondary", "lg")}>
                  See How It Works
                </Link>
              </div>

              <p className="mt-4 text-[12.5px] text-muted">
                No account needed · No app to install · Works on every phone
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-line pt-6">
                {CONTENT_TYPES.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-muted"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <HeroArt qrSvg={qrSvg} />
          </div>
        </section>

        <section id="how" className="border-y border-line bg-white/60">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>How it works</SectionLabel>
                <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight tracking-tight sm:text-[40px]">
                  Three steps from an idea to a scan.
                </h2>
              </div>
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline"
              >
                Try it now <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-line bg-paper p-6 transition-colors hover:border-line-strong"
                >
                  <span className="font-serif text-[13px] text-accent-ink">0{index + 1}</span>
                  <h3 className="mt-3 text-[17px] font-medium tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <SectionLabel>Built for the whole page</SectionLabel>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-[40px]">
            Everything a shared page should be — and nothing it shouldn&apos;t.
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-line bg-white p-6 transition-shadow hover:shadow-[0_30px_60px_-50px_rgba(20,20,22,0.45)] sm:p-7"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-shell text-ink">
                  <feature.icon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 text-[17px] font-medium tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{feature.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="privacy" className="border-y border-line bg-white/60">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
            <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <SectionLabel>Access control</SectionLabel>
                <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-[40px]">
                  You decide who gets in.
                </h2>
                <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-muted">
                  Every page has its own access setting. Passwords are hashed, checks happen on the
                  server, and private pages never touch a public URL. You can disable or delete a
                  page at any time — its QR code stops working immediately.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ACCESS_MODES.map((mode) => (
                  <div key={mode.label} className="rounded-2xl border border-line bg-paper p-5">
                    <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink">
                      <mode.icon className="h-4 w-4" />
                      {mode.label}
                    </span>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{mode.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-14 text-paper sm:px-12 md:py-16">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="max-w-xl font-serif text-3xl leading-[1.08] tracking-tight sm:text-[46px]">
                  Your first page is about sixty seconds away.
                </h2>
                <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-paper/70">
                  Start with a sentence. Add a photo if you feel like it. Publish, scan, done.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/create"
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-white"
                  >
                    Create for Free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center rounded-full border border-paper/20 px-6 text-sm text-paper/90 transition-colors hover:bg-paper/10"
                  >
                    Create an account
                  </Link>
                </div>
              </div>

              <div className="justify-self-center">
                <div className="w-[168px] rounded-2xl bg-paper p-3 text-ink">
                  {qrSvg ? (
                    <div
                      className="[&>svg]:h-auto [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-xl bg-shell">
                      <QrCode className="h-10 w-10 text-muted" />
                    </div>
                  )}
                  <p className="mt-2 text-center text-[10px] uppercase tracking-[0.16em] text-muted">
                    Scan to start
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-6 w-6" />
            <span className="text-[13px] text-muted">
              PKLink — content pages behind a QR code.
            </span>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-muted">
            <Link href="/create" className="hover:text-ink">
              Create
            </Link>
            <Link href="/dashboard" className="hover:text-ink">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroArt({ qrSvg }: { qrSvg: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute -inset-5 rounded-[3rem] bg-shell/80" aria-hidden="true" />
      <div className="relative rounded-[2.1rem] border border-line bg-white p-3 shadow-[0_60px_100px_-70px_rgba(20,20,22,0.65)]">
        <div className="rounded-[1.6rem] bg-paper p-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
            Shared with a scan
          </span>
          <h3 className="mt-3 font-serif text-[26px] leading-tight tracking-tight text-ink">
            A weekend in the mountains
          </h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            The photos, the address for Saturday, and the playlist for the drive up.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[#dde5df] to-[#b6c4ba]" />
            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[#eae2d4] to-[#c9b99f]" />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5">
            <span className="text-[12px] text-ink">Directions &amp; parking</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-[12px] text-ink">
              <FileText className="h-3.5 w-3.5 text-muted" /> Itinerary.pdf
            </span>
            <span className="text-[11px] text-muted">240 KB</span>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 -left-3 w-[124px] rotate-[-5deg] rounded-2xl border border-line bg-white p-2.5 shadow-[0_24px_50px_-30px_rgba(20,20,22,0.5)] sm:-left-6">
        {qrSvg ? (
          <div
            className="[&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : (
          <div className="grid aspect-square place-items-center rounded-lg bg-shell">
            <QrCode className="h-8 w-8 text-muted" />
          </div>
        )}
        <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.16em] text-muted">
          scan me
        </p>
      </div>
    </div>
  );
}
