"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Globe,
  GripVertical,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { saveCreationAction } from "@/app/actions";
import { ArticleBlocks } from "./article-blocks";
import { Badge, Button, Field, Input, Label, Textarea } from "./ui";
import { ACCESS_DESCRIPTIONS, ACCESS_LABELS, type AccessType, type Block, type RenderBlock } from "@/lib/types";
import { cn, formatBytes, normalizeUrl } from "@/lib/utils";

type DraftBlock = {
  id: string;
  type: Block["type"];
  text?: string;
  mediaId?: string;
  url?: string;
  label?: string;
  caption?: string;
  name?: string;
  mime?: string;
  size?: number;
  previewUrl?: string;
};

export type EditorInitial = {
  id: string;
  title: string;
  subtitle: string;
  blocks: RenderBlock[];
  accessType: AccessType;
  expiresAt: number | null;
  slug: string;
};

const ACCESS_OPTIONS: {
  value: AccessType;
  icon: typeof Globe;
}[] = [
  { value: "public", icon: Globe },
  { value: "unlisted", icon: EyeOff },
  { value: "password", icon: KeyRound },
  { value: "private", icon: Lock },
];

const ACCEPT = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/avif",
  video: "video/mp4,video/webm,video/quicktime",
  file: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,audio/mpeg,audio/mp4,audio/wav",
};

function newBlockId() {
  return crypto.randomUUID();
}

function storedBlock(block: DraftBlock): Block {
  if (block.type === "text") {
    return { id: block.id, type: "text", text: block.text ?? "" };
  }
  if (block.type === "link") {
    return { id: block.id, type: "link", url: block.url ?? "", label: block.label || undefined };
  }
  return {
    id: block.id,
    type: block.type,
    mediaId: block.mediaId ?? "",
    caption: block.caption || undefined,
  };
}

function toPreviewBlock(block: DraftBlock): RenderBlock | null {
  if (block.type === "text") {
    if (!block.text?.trim()) return null;
    return { id: block.id, type: "text", text: block.text };
  }
  if (block.type === "link") {
    if (!block.url?.trim()) return null;
    return {
      id: block.id,
      type: "link",
      url: normalizeUrl(block.url),
      label: block.label || undefined,
    };
  }
  if (!block.previewUrl) return null;
  return {
    id: block.id,
    type: block.type,
    mediaId: block.mediaId ?? "",
    caption: block.caption || undefined,
    url: block.previewUrl,
    fileName: block.name,
    fileSize: block.size,
    mimeType: block.mime,
  };
}

function dateInputValue(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

export function Editor({
  mode,
  initial,
  isGuest,
}: {
  mode: "create" | "edit";
  initial?: EditorInitial;
  isGuest: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [blocks, setBlocks] = useState<DraftBlock[]>(() =>
    (initial?.blocks ?? []).map((block) => {
      if (block.type === "text") return { id: block.id, type: "text", text: block.text };
      if (block.type === "link") {
        return { id: block.id, type: "link", url: block.url ?? "", label: block.label };
      }
      return {
        id: block.id,
        type: block.type,
        mediaId: block.mediaId,
        caption: block.caption,
        name: block.fileName,
        mime: block.mimeType,
        size: block.fileSize,
        previewUrl: block.url,
      };
    }),
  );
  const [accessType, setAccessType] = useState<AccessType>(initial?.accessType ?? "public");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState(dateInputValue(initial?.expiresAt ?? null));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const previewBlocks = useMemo(
    () =>
      blocks
        .map(toPreviewBlock)
        .filter((block): block is RenderBlock => block !== null),
    [blocks],
  );

  function updateBlock(id: string, patch: Partial<DraftBlock>) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  }

  function removeBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropBlock(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    setBlocks((current) => {
      const next = [...current];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function uploadFiles(files: FileList | null, target: "image" | "video" | "file") {
    if (!files || files.length === 0) return;
    setError(null);

    for (const file of Array.from(files)) {
      setUploading((count) => count + 1);
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body });
        const data = (await response.json()) as {
          id?: string;
          url?: string;
          name?: string;
          type?: string;
          size?: number;
          kind?: string;
          error?: string;
        };

        if (!response.ok || !data.id) {
          setError(data.error ?? "That upload failed. Try a different file.");
          continue;
        }

        const resolvedType: DraftBlock["type"] =
          data.kind === "image" ? "image" : data.kind === "video" ? "video" : "file";

        const block: DraftBlock = {
          id: newBlockId(),
          type: target === "image" ? "image" : target === "video" ? "video" : resolvedType,
          mediaId: data.id,
          name: data.name,
          mime: data.type,
          size: data.size,
          previewUrl: data.url,
        };
        setBlocks((current) => [...current, block]);
      } catch {
        setError("That upload failed. Check your connection and try again.");
      } finally {
        setUploading((count) => Math.max(0, count - 1));
      }
    }

    if (imageInput.current) imageInput.current.value = "";
    if (videoInput.current) videoInput.current.value = "";
    if (fileInput.current) fileInput.current.value = "";
  }

  async function publish() {
    setError(null);
    if (!title.trim() && previewBlocks.length === 0) {
      setError("Add a title or some content before publishing.");
      return;
    }
    if (accessType === "password" && !password && !initial) {
      setError("Set a password for this page.");
      return;
    }

    setSaving(true);
    try {
      const expiry = expiresAt ? new Date(`${expiresAt}T23:59:59`).getTime() : null;
      const result = await saveCreationAction({
        id: initial?.id ?? null,
        title,
        subtitle,
        blocks: blocks.filter((block) => toPreviewBlock(block) !== null).map(storedBlock),
        accessType,
        password,
        expiresAt: expiry,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/dashboard/${result.id}?${mode === "create" ? "created=1" : "saved=1"}`);
      router.refresh();
    } catch {
      setError("Something went wrong while publishing. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const accessIcon = (type: AccessType) =>
    ACCESS_OPTIONS.find((option) => option.value === type)?.icon ?? Globe;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={mode === "edit" && initial ? `/dashboard/${initial.id}` : "/dashboard"}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {mode === "edit" ? "Back to page" : "Dashboard"}
          </Link>
          <h1 className="font-serif text-[34px] leading-tight tracking-tight text-ink sm:text-[40px]">
            {mode === "edit" ? "Edit your page" : "Create something"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Write, upload and arrange. Your page and QR code are ready the moment you publish.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowPreview((value) => !value)}
          >
            <Eye className="h-4 w-4" />
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Button onClick={publish} disabled={saving || uploading > 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving
              ? "Publishing…"
              : mode === "edit"
                ? "Save changes"
                : isGuest
                  ? "Publish for free"
                  : "Publish"}
          </Button>
        </div>
      </div>

      {isGuest ? (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-[13px] text-accent-ink">
          <span className="font-medium">You&apos;re creating as a guest.</span>
          <span className="text-accent-ink/80">
            Pages stay editable on this browser — create a free account to keep them anywhere.
          </span>
          <Link href="/signup" className="ml-auto font-medium underline underline-offset-4">
            Save my pages
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-danger">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-white p-5 sm:p-7">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Page title"
              maxLength={120}
              className="w-full border-0 bg-transparent font-serif text-3xl leading-tight tracking-tight text-ink placeholder:text-line-strong focus:outline-none sm:text-[34px]"
            />
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Add a subtitle (optional)"
              maxLength={200}
              className="mt-2 w-full border-0 bg-transparent text-[15px] text-muted placeholder:text-line-strong focus:outline-none"
            />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <ImageIcon className="h-3.5 w-3.5" /> Photos
              </button>
              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <Video className="h-3.5 w-3.5" /> Video
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <FileText className="h-3.5 w-3.5" /> Document
              </button>
              <span className="ml-auto self-center text-[11px] text-muted">
                {uploading > 0 ? `Uploading ${uploading} file${uploading > 1 ? "s" : ""}…` : "Up to 80 MB per video"}
              </span>
            </div>
            <input
              ref={imageInput}
              type="file"
              accept={ACCEPT.image}
              multiple
              hidden
              onChange={(event) => uploadFiles(event.target.files, "image")}
            />
            <input
              ref={videoInput}
              type="file"
              accept={ACCEPT.video}
              hidden
              onChange={(event) => uploadFiles(event.target.files, "video")}
            />
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT.file}
              hidden
              onChange={(event) => uploadFiles(event.target.files, "file")}
            />
          </div>

          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropBlock(index)}
                className={cn(
                  "rounded-2xl border bg-white transition-colors",
                  dragIndex === index ? "border-accent/40 opacity-60" : "border-line",
                )}
              >
                <div className="flex items-center gap-1.5 border-b border-line/70 px-3 py-2">
                  <span
                    draggable
                    onDragStart={(event) => {
                      setDragIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className="cursor-grab rounded p-1 text-muted/60 hover:text-ink active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                    {block.type === "image"
                      ? "Photo"
                      : block.type === "video"
                        ? "Video"
                        : block.type === "file"
                          ? "Document"
                          : block.type === "link"
                            ? "Link"
                            : "Text"}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-shell hover:text-ink disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-shell hover:text-ink disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger"
                      aria-label="Remove block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5">
                  {block.type === "text" ? (
                    <Textarea
                      value={block.text ?? ""}
                      onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                      placeholder="Write something… Use ## for a heading and leave a blank line between paragraphs."
                      rows={5}
                      className="border-0 bg-transparent px-0 py-0 focus:ring-0"
                    />
                  ) : null}

                  {block.type === "link" ? (
                    <div className="space-y-2.5">
                      <Input
                        value={block.url ?? ""}
                        onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                        placeholder="https://example.com"
                        inputMode="url"
                      />
                      <Input
                        value={block.label ?? ""}
                        onChange={(event) => updateBlock(block.id, { label: event.target.value })}
                        placeholder="Button label (optional)"
                      />
                    </div>
                  ) : null}

                  {block.type === "image" ? (
                    <div className="flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={block.previewUrl}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-[13px] text-muted">
                          {block.name} {block.size ? `· ${formatBytes(block.size)}` : ""}
                        </p>
                        <Input
                          value={block.caption ?? ""}
                          onChange={(event) => updateBlock(block.id, { caption: event.target.value })}
                          placeholder="Caption (optional)"
                          className="h-9 text-[13px]"
                        />
                      </div>
                    </div>
                  ) : null}

                  {block.type === "video" ? (
                    <div className="flex gap-3">
                      <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-ink text-paper">
                        <Video className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-[13px] text-muted">
                          {block.name} {block.size ? `· ${formatBytes(block.size)}` : ""}
                        </p>
                        <Input
                          value={block.caption ?? ""}
                          onChange={(event) => updateBlock(block.id, { caption: event.target.value })}
                          placeholder="Caption (optional)"
                          className="h-9 text-[13px]"
                        />
                      </div>
                    </div>
                  ) : null}

                  {block.type === "file" ? (
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-shell text-ink-soft">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{block.name}</p>
                        <p className="text-[11px] text-muted">
                          {block.size ? formatBytes(block.size) : "Document"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setBlocks((current) => [
                    ...current,
                    { id: newBlockId(), type: "text", text: "" },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <Type className="h-3.5 w-3.5" /> Text
              </button>
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <ImageIcon className="h-3.5 w-3.5" /> Photo
              </button>
              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <Video className="h-3.5 w-3.5" /> Video
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <FileText className="h-3.5 w-3.5" /> Document
              </button>
              <button
                type="button"
                onClick={() =>
                  setBlocks((current) => [
                    ...current,
                    { id: newBlockId(), type: "link", url: "", label: "" },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                <Link2 className="h-3.5 w-3.5" /> Link
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 sm:p-7">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
              Who can see this
            </h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {ACCESS_OPTIONS.map((option) => {
                const Icon = accessIcon(option.value);
                const active = accessType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccessType(option.value)}
                    className={cn(
                      "rounded-2xl border p-3.5 text-left transition-colors",
                      active
                        ? "border-ink bg-shell/60"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Icon className="h-4 w-4" />
                      {ACCESS_LABELS[option.value]}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-muted">
                      {ACCESS_DESCRIPTIONS[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>

            {accessType === "password" ? (
              <div className="mt-4 max-w-sm">
                <Field
                  label="Page password"
                  hint={
                    initial
                      ? "Leave blank to keep the current password."
                      : "Visitors enter this before the page opens."
                  }
                >
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 4 characters"
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            ) : null}

            <div className="mt-5 max-w-xs border-t border-line pt-5">
              <Field label="Expires (optional)" hint="The page and its QR code stop working after this date.">
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className={cn("lg:sticky lg:top-24", showPreview ? "block" : "hidden lg:block")}>
          <div className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
                <Eye className="h-3.5 w-3.5" /> Live preview
              </span>
              <Badge tone="accent">{(title || "Untitled").slice(0, 22)}</Badge>
            </div>
            <div className="max-h-[70vh] overflow-y-auto bg-paper p-5 sm:p-6">
              <article>
                <h3 className="font-serif text-[26px] leading-tight tracking-tight text-ink">
                  {title || "Your page title"}
                </h3>
                {subtitle ? (
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{subtitle}</p>
                ) : null}
                <div className="my-5 h-px bg-line" />
                {previewBlocks.length > 0 ? (
                  <ArticleBlocks blocks={previewBlocks} compact />
                ) : (
                  <div className="rounded-2xl border border-dashed border-line px-4 py-10 text-center">
                    <p className="text-[13px] font-medium text-ink-soft">Nothing here yet</p>
                    <p className="mt-1 text-[12px] text-muted">
                      Add text, photos or files to see your page come to life.
                    </p>
                  </div>
                )}
              </article>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <ArrowUpRight className="h-3 w-3" /> This is exactly what visitors see
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <p className="text-[12px] text-muted">
          {blocks.length} block{blocks.length === 1 ? "" : "s"} ·{" "}
          {previewBlocks.filter((block) => block.type !== "text" && block.type !== "link").length}{" "}
          media file
          {previewBlocks.filter((block) => block.type !== "text" && block.type !== "link").length === 1
            ? ""
            : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => imageInput.current?.click()}
            disabled={uploading > 0}
          >
            <Plus className="h-3.5 w-3.5" /> Add media
          </Button>
          <Button onClick={publish} disabled={saving || uploading > 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "edit" ? "Save changes" : "Publish page"}
          </Button>
        </div>
      </div>
    </div>
  );
}
