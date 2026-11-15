import { execute, queryAll, queryOne } from "./db";
import type { MediaRow } from "./types";

export const MAX_UPLOAD_BYTES: Record<"image" | "video" | "document", number> = {
  image: 12 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

export type UploadKind = "image" | "video" | "document";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg"]);

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
]);

export function classifyUpload(mimeType: string): UploadKind | null {
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  if (DOCUMENT_TYPES.has(mime)) return "document";
  return null;
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 160) || "file";
}

export function attachmentFor(blockType: string): string {
  if (blockType === "image") return "inline";
  if (blockType === "video") return "inline";
  return "attachment";
}

export async function getMediaById(id: string): Promise<MediaRow | null> {
  return queryOne<MediaRow>("SELECT * FROM media WHERE id = ?", id);
}

export async function getMediaRows(ids: string[]): Promise<MediaRow[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  return queryAll<MediaRow>(`SELECT * FROM media WHERE id IN (${placeholders})`, ...ids);
}

export async function deleteMediaObjects(rows: MediaRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { getEnv } = await import("./cf");
  const { FILES } = await getEnv();
  await Promise.allSettled(rows.map((row) => FILES.delete(row.r2_key)));
}

export async function createMediaRow(input: {
  ownerUserId: string | null;
  ownerGuestToken: string | null;
  r2Key: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}): Promise<MediaRow> {
  const row: MediaRow = {
    id: crypto.randomUUID(),
    creation_id: null,
    owner_user_id: input.ownerUserId,
    owner_guest_token: input.ownerGuestToken,
    r2_key: input.r2Key,
    file_type: input.fileType,
    file_name: input.fileName,
    file_size: input.fileSize,
    created_at: Date.now(),
  };

  await execute(
    `INSERT INTO media (id, creation_id, owner_user_id, owner_guest_token, r2_key, file_type, file_name, file_size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.creation_id,
    row.owner_user_id,
    row.owner_guest_token,
    row.r2_key,
    row.file_type,
    row.file_name,
    row.file_size,
    row.created_at,
  );

  return row;
}

export function mediaUrl(id: string): string {
  return `/api/files/${id}`;
}
