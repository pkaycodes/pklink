"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, ImagePlus, Loader2, Printer, Trash2 } from "lucide-react";
import { saveQrAction } from "@/app/actions";
import { Button, Input, Label } from "./ui";
import type { QrSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

type Modules = { size: number; data: Uint8Array };

const PRESETS: { name: string; fg: string; bg: string }[] = [
  { name: "Ink", fg: "#141416", bg: "#ffffff" },
  { name: "Indigo", fg: "#3325d6", bg: "#ffffff" },
  { name: "Forest", fg: "#0e5b45", bg: "#f4faf7" },
  { name: "Wine", fg: "#7a1f3d", bg: "#fff8fa" },
  { name: "Night", fg: "#faf9f6", bg: "#141416" },
];

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, size, size, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + size - radius, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
  ctx.lineTo(x + size, y + size - radius);
  ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
  ctx.lineTo(x + radius, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 0;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function QrPanel({
  creationId,
  url,
  initial,
  fileName = "qr-code",
  variant = "card",
}: {
  creationId: string;
  url: string;
  initial: QrSettings;
  fileName?: string;
  variant?: "card" | "page";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<QrSettings>(initial);
  const [modules, setModules] = useState<Modules | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const didMount = useRef(false);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((loaded) => {
        const creator = (loaded.default ?? loaded) as unknown as {
          create: (
            text: string,
            options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
          ) => { modules: Modules };
        };
        const qr = creator.create(url, { errorCorrectionLevel: "H" });
        if (!cancelled) setModules({ size: qr.modules.size, data: qr.modules.data });
      })
      .catch(() => {
        if (!cancelled) setModules(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!settings.logo) {
      setLogoImage(null);
      return;
    }
    const image = new Image();
    image.onload = () => setLogoImage(image);
    image.onerror = () => setLogoImage(null);
    image.src = settings.logo;
  }, [settings.logo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !modules) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelSize = 1024;
    const quiet = 4;
    const total = modules.size + quiet * 2;
    const cell = pixelSize / total;

    canvas.width = pixelSize;
    canvas.height = pixelSize;

    context.fillStyle = settings.bg;
    context.fillRect(0, 0, pixelSize, pixelSize);
    context.fillStyle = settings.fg;

    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (!modules.data[row * modules.size + column]) continue;
        const x = (column + quiet) * cell;
        const y = (row + quiet) * cell;
        if (settings.rounded) {
          roundedPath(context, x + cell * 0.06, y + cell * 0.06, cell * 0.88, cell * 0.3);
          context.fill();
        } else {
          context.fillRect(x, y, cell, cell);
        }
      }
    }

    if (settings.logo && logoImage) {
      const box = pixelSize * settings.logoSize;
      const left = (pixelSize - box) / 2;
      const top = (pixelSize - box) / 2;
      const pad = box * 0.1;
      context.fillStyle = settings.bg;
      roundedPath(context, left - pad, top - pad, box + pad * 2, box * 0.22);
      context.fill();

      const scale = Math.min(box / logoImage.width, box / logoImage.height);
      const width = logoImage.width * scale;
      const height = logoImage.height * scale;
      context.drawImage(
        logoImage,
        left + (box - width) / 2,
        top + (box - height) / 2,
        width,
        height,
      );
    }
  }, [modules, settings, logoImage]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const result = await saveQrAction(creationId, settings);
      setSaveState(result.ok ? "saved" : "error");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [settings, creationId]);

  function buildSvg(): string | null {
    if (!modules) return null;
    const quiet = 4;
    const total = modules.size + quiet * 2;
    let path = "";
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (!modules.data[row * modules.size + column]) continue;
        const x = column + quiet;
        const y = row + quiet;
        if (settings.rounded) {
          path += `M${x + 0.06} ${y}h${0.88 - 0.3}a0.3 0.3 0 0 1 0.3 0.3v${0.88 - 0.6}a0.3 0.3 0 0 1 -0.3 0.3h-${0.88 - 0.6}a0.3 0.3 0 0 1 -0.3 -0.3v-${0.88 - 0.6}a0.3 0.3 0 0 1 0.3 -0.3z`;
        } else {
          path += `M${x} ${y}h1v1h-1z`;
        }
      }
    }

    let logo = "";
    if (settings.logo) {
      const box = total * settings.logoSize;
      const start = (total - box) / 2;
      const pad = box * 0.1;
      logo =
        `<rect x="${start - pad}" y="${start - pad}" width="${box + pad * 2}" height="${box + pad * 2}" rx="${box * 0.22}" fill="${settings.bg}"/>` +
        `<image href="${settings.logo}" x="${start}" y="${start}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total * 64}" height="${total * 64}"><rect width="${total}" height="${total}" fill="${settings.bg}"/><path d="${path}" fill="${settings.fg}"/>${logo}</svg>`;
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${fileName}-qr.png`);
    }, "image/png");
  }

  function downloadSvg() {
    const svg = buildSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileName}-qr.svg`);
  }

  async function handleLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setSaveState("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 192;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) return;
        const scale = Math.min(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        setSettings((current) => ({ ...current, logo: canvas.toDataURL("image/png") }));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    if (logoInput.current) logoInput.current.value = "";
  }

  const contrast = Math.abs(luminance(settings.fg) - luminance(settings.bg));
  const lowContrast = contrast < 0.35;
  const isPage = variant === "page";

  return (
    <div className={isPage ? "grid gap-8 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]" : "space-y-5"}>
      <div className="print-sheet rounded-3xl border border-line bg-white p-5 shadow-[0_24px_60px_-50px_rgba(20,20,22,0.6)]">
        <div className="relative mx-auto max-w-[280px]">
          <canvas
            ref={canvasRef}
            className="h-auto w-full rounded-xl"
            aria-label="QR code for this page"
          />
          {!modules ? (
            <div className="absolute inset-0 grid place-items-center rounded-xl bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : null}
        </div>
        <p className="mt-4 truncate text-center text-[11px] text-muted">{url.replace(/^https?:\/\//, "")}</p>
      </div>

      <div className="no-print space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={downloadPng} disabled={!modules}>
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadSvg} disabled={!modules}>
            <Download className="h-3.5 w-3.5" /> SVG
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <span className="ml-auto self-center text-[11px] text-muted">
            {saveState === "saving"
              ? "Saving design…"
              : saveState === "saved"
                ? "Design saved"
                : saveState === "error"
                  ? "Could not save design"
                  : ""}
          </span>
        </div>

        <div>
          <Label className="mb-2">Presets</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  setSettings((current) => ({ ...current, fg: preset.fg, bg: preset.bg }))
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-line-strong"
              >
                <span className="flex overflow-hidden rounded-full border border-line">
                  <span className="h-3.5 w-2" style={{ background: preset.bg }} />
                  <span className="h-3.5 w-2" style={{ background: preset.fg }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="qr-fg">Code color</Label>
            <div className="flex items-center gap-2">
              <input
                id="qr-fg"
                type="color"
                value={settings.fg}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, fg: event.target.value }))
                }
                className="h-9 w-9 cursor-pointer rounded-lg border border-line bg-white p-0.5"
              />
              <span className="text-[12px] uppercase text-muted">{settings.fg}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-bg">Background</Label>
            <div className="flex items-center gap-2">
              <input
                id="qr-bg"
                type="color"
                value={settings.bg}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, bg: event.target.value }))
                }
                className="h-9 w-9 cursor-pointer rounded-lg border border-line bg-white p-0.5"
              />
              <span className="text-[12px] uppercase text-muted">{settings.bg}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
          <div>
            <p className="text-[13px] font-medium text-ink">Rounded dots</p>
            <p className="text-[11px] text-muted">Slightly softer, still easy to scan.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.rounded}
            onClick={() => setSettings((current) => ({ ...current, rounded: !current.rounded }))}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              settings.rounded ? "bg-ink" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                settings.rounded ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        <div className="space-y-2">
          <Label>Center logo</Label>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => logoInput.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5" /> {settings.logo ? "Replace" : "Upload logo"}
            </Button>
            {settings.logo ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSettings((current) => ({ ...current, logo: null }))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            ) : null}
            {settings.logo ? <Check className="h-3.5 w-3.5 text-success" /> : null}
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => handleLogo(event.target.files?.[0])}
            />
          </div>
          {settings.logo ? (
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={0.12}
                max={0.3}
                step={0.01}
                value={settings.logoSize}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    logoSize: Number(event.target.value),
                  }))
                }
                className="h-1 w-full accent-ink"
              />
              <span className="w-9 text-right text-[11px] text-muted">
                {Math.round(settings.logoSize * 100)}%
              </span>
            </div>
          ) : null}
        </div>

        {lowContrast ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
            These two colors are very close. Scanners need clear contrast — try a darker code or a
            lighter background.
          </p>
        ) : null}
      </div>
    </div>
  );
}
