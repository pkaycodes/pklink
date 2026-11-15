"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Download, FileText, Link2, X } from "lucide-react";
import { cn, domainOf, formatBytes } from "@/lib/utils";
import type { RenderBlock, RenderMediaBlock } from "@/lib/types";

type Group =
  | { key: string; kind: "gallery"; blocks: RenderMediaBlock[] }
  | { key: string; kind: "single"; block: RenderBlock };

function group(blocks: RenderBlock[]): Group[] {
  const groups: Group[] = [];
  let images: RenderMediaBlock[] = [];

  const flush = () => {
    if (images.length) {
      groups.push({ key: images[0].id, kind: "gallery", blocks: images });
      images = [];
    }
  };

  for (const block of blocks) {
    if (block.type === "image" && block.url) {
      images.push(block);
      continue;
    }
    flush();
    groups.push({ key: block.id, kind: "single", block });
  }
  flush();

  return groups;
}

function TextContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((part) => part.trim().length > 0);
  return (
    <div className="page-prose">
      {paragraphs.map((paragraph, index) => {
        const trimmed = paragraph.trim();
        if (trimmed.startsWith("## ")) {
          return <h2 key={index}>{trimmed.slice(3)}</h2>;
        }
        return (
          <p key={index} className="whitespace-pre-line">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export function ArticleBlocks({
  blocks,
  compact = false,
}: {
  blocks: RenderBlock[];
  compact?: boolean;
}) {
  const [lightbox, setLightbox] = useState<RenderMediaBlock | null>(null);
  const groups = group(blocks);

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close]);

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted">
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className={cn(compact ? "space-y-5" : "space-y-8")}>
      {groups.map((entry) => {
        if (entry.kind === "gallery") {
          const count = entry.blocks.length;
          return (
            <div
              key={entry.key}
              className={cn(
                "grid gap-2.5",
                count === 1 ? "grid-cols-1" : "grid-cols-2",
                count >= 3 && !compact && "sm:grid-cols-3",
              )}
            >
              {entry.blocks.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => image.url && setLightbox(image)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl bg-shell focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                    count === 1 ? "aspect-[4/3]" : "aspect-square",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.caption || "Shared image"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  {image.caption ? (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 text-left text-xs text-white/90">
                      {image.caption}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          );
        }

        const block = entry.block;

        if (block.type === "text") {
          return <TextContent key={block.id} text={block.text} />;
        }

        if (block.type === "video" && block.url) {
          return (
            <figure key={block.id} className="space-y-2">
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-2xl bg-black"
                src={block.url}
              />
              {block.caption ? (
                <figcaption className="text-center text-[13px] text-muted">
                  {block.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.type === "file" && block.url) {
          return (
            <a
              key={block.id}
              href={block.url}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-line-strong"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-shell text-ink-soft">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {block.fileName ?? "Document"}
                </span>
                <span className="block text-xs text-muted">
                  {block.fileSize ? formatBytes(block.fileSize) : block.mimeType ?? "File"}
                </span>
              </span>
              <span className="shrink-0 text-muted">
                <Download className="h-4 w-4" />
              </span>
            </a>
          );
        }

        if (block.type === "link") {
          return (
            <a
              key={block.id}
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_16px_40px_-28px_rgba(20,20,22,0.45)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <Link2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {block.label || domainOf(block.url!)}
                </span>
                <span className="block truncate text-xs text-muted">{domainOf(block.url!)}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
            </a>
          );
        }

        return null;
      })}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close image"
            className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.caption || "Shared image"}
            className="max-h-[88vh] max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          {lightbox.caption ? (
            <p className="absolute bottom-6 left-1/2 max-w-lg -translate-x-1/2 text-center text-sm text-white/80">
              {lightbox.caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
