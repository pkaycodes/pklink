import { isHttpUrl, normalizeUrl } from "./utils";
import type { Block, ContentType, LinkBlock, MediaBlock, StoredBlock, TextBlock } from "./types";

export const LIMITS = {
  title: 120,
  subtitle: 200,
  textBlock: 8000,
  caption: 240,
  urlLabel: 120,
  maxBlocks: 60,
  password: 128,
};

export function sanitizeText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

function sanitizeBlockId(value: unknown): string {
  if (typeof value === "string" && /^[a-zA-Z0-9_-]{6,64}$/.test(value)) return value;
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateBlocks(input: unknown): { blocks: StoredBlock[]; error?: string } {
  if (!Array.isArray(input)) return { blocks: [], error: "Content is missing." };
  if (input.length > LIMITS.maxBlocks) {
    return { blocks: [], error: `A page can hold at most ${LIMITS.maxBlocks} blocks.` };
  }

  const blocks: StoredBlock[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    if (!isRecord(raw)) continue;
    const id = sanitizeBlockId(raw.id);
    if (seen.has(id)) continue;

    const type = raw.type;

    if (type === "text") {
      const text = sanitizeText(raw.text, LIMITS.textBlock);
      if (!text) continue;
      seen.add(id);
      const block: TextBlock = { id, type: "text", text };
      blocks.push(block);
      continue;
    }

    if (type === "link") {
      const url = normalizeUrl(sanitizeText(raw.url, 2000));
      if (!url || !isHttpUrl(url)) continue;
      seen.add(id);
      const block: LinkBlock = {
        id,
        type: "link",
        url,
        label: sanitizeText(raw.label, LIMITS.urlLabel) || undefined,
      };
      blocks.push(block);
      continue;
    }

    if (type === "image" || type === "video" || type === "file") {
      const mediaId = typeof raw.mediaId === "string" ? raw.mediaId.trim() : "";
      if (!/^[a-f0-9-]{20,40}$/i.test(mediaId)) continue;
      seen.add(id);
      const block: MediaBlock = {
        id,
        type,
        mediaId,
        caption: sanitizeText(raw.caption, LIMITS.caption) || undefined,
      };
      blocks.push(block);
    }
  }

  if (blocks.length === 0) {
    return { blocks: [], error: "Add some text, media or a link before publishing." };
  }

  return { blocks };
}

export function detectContentType(blocks: Block[]): ContentType {
  const kinds = new Set(blocks.map((block) => block.type));
  const mediaKinds = new Set(
    blocks
      .filter((block): block is MediaBlock => block.type !== "text" && block.type !== "link")
      .map((block) => block.type),
  );

  if (kinds.size === 1) {
    const only = [...kinds][0];
    if (only === "text") return "text";
    if (only === "link") return "link";
    if (only === "image") return "gallery";
    if (only === "video") return "video";
    if (only === "file") return "document";
  }

  const hasText = kinds.has("text");
  if (mediaKinds.size === 1 && !hasText && !kinds.has("link")) {
    const only = [...mediaKinds][0];
    if (only === "image") return "gallery";
    if (only === "video") return "video";
    if (only === "file") return "document";
  }

  return "mixed";
}

export function summarizeBlocks(blocks: Block[]): string {
  for (const block of blocks) {
    if (block.type === "text") {
      return block.text.replace(/\s+/g, " ").slice(0, 180);
    }
  }
  return "";
}

export function countBlocks(blocks: Block[]): { media: number; images: number } {
  let media = 0;
  let images = 0;
  for (const block of blocks) {
    if (block.type === "image" || block.type === "video" || block.type === "file") media += 1;
    if (block.type === "image") images += 1;
  }
  return { media, images };
}
