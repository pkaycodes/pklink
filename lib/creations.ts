import { cookies } from "next/headers";
import { execute, queryAll, queryOne } from "./db";
import { getAppSecret } from "./app-settings";
import { hashPassword, newId, randomSlug, signToken, timingSafeEqual } from "./security";
import { detectContentType, LIMITS, sanitizeText, validateBlocks } from "./validate";
import { deleteMediaObjects, getMediaRows, mediaUrl } from "./media";
import { ownerFilter, type Owner } from "./auth";
import {
  DEFAULT_QR_SETTINGS,
  type AccessType,
  type Block,
  type ContentType,
  type Creation,
  type CreationRow,
  type MediaRow,
  type QrSettings,
  type RenderBlock,
  type StoredBlock,
} from "./types";

const ACCESS_TYPES: AccessType[] = ["public", "unlisted", "password", "private"];

export type SaveCreationInput = {
  id?: string | null;
  title: unknown;
  subtitle?: unknown;
  blocks: unknown;
  accessType: unknown;
  password?: unknown;
  clearPassword?: boolean;
  expiresAt?: number | null;
};

export type SaveCreationResult =
  | { ok: true; creation: Creation }
  | { ok: false; error: string };

export function parseBlocks(raw: string): Block[] {
  try {
    const parsed = JSON.parse(raw) as Block[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function hydrateBlocks(blocks: Block[]): Promise<RenderBlock[]> {
  const mediaIds = blocks
    .filter((block) => block.type === "image" || block.type === "video" || block.type === "file")
    .map((block) => (block as { mediaId: string }).mediaId);

  if (mediaIds.length === 0) return blocks;

  const rows = await getMediaRows([...new Set(mediaIds)]);
  const byId = new Map(rows.map((row) => [row.id, row]));

  return blocks.flatMap<RenderBlock>((block) => {
    if (block.type === "image" || block.type === "video" || block.type === "file") {
      const media = byId.get(block.mediaId);
      if (!media) return [];
      return [
        {
          ...block,
          url: mediaUrl(media.id),
          fileName: media.file_name,
          fileSize: media.file_size,
          mimeType: media.file_type,
        },
      ];
    }
    return [block];
  });
}

export async function getQrSettings(creationId: string): Promise<QrSettings> {
  const row = await queryOne<{ settings: string }>(
    "SELECT settings FROM qr_codes WHERE creation_id = ?",
    creationId,
  );
  if (!row) return DEFAULT_QR_SETTINGS;
  try {
    const parsed = JSON.parse(row.settings) as Partial<QrSettings>;
    return {
      fg: typeof parsed.fg === "string" ? parsed.fg : DEFAULT_QR_SETTINGS.fg,
      bg: typeof parsed.bg === "string" ? parsed.bg : DEFAULT_QR_SETTINGS.bg,
      logo: typeof parsed.logo === "string" ? parsed.logo : null,
      logoSize:
        typeof parsed.logoSize === "number"
          ? Math.min(0.34, Math.max(0.1, parsed.logoSize))
          : DEFAULT_QR_SETTINGS.logoSize,
      rounded: typeof parsed.rounded === "boolean" ? parsed.rounded : true,
    };
  } catch {
    return DEFAULT_QR_SETTINGS;
  }
}

export async function saveQrSettings(
  creationId: string,
  settings: unknown,
): Promise<{ ok: boolean; error?: string }> {
  if (typeof settings !== "object" || settings === null) {
    return { ok: false, error: "Invalid QR settings." };
  }
  const input = settings as Partial<QrSettings>;
  const hex = /^#[0-9a-fA-F]{6}$/;
  const fg = typeof input.fg === "string" && hex.test(input.fg) ? input.fg : DEFAULT_QR_SETTINGS.fg;
  const bg = typeof input.bg === "string" && hex.test(input.bg) ? input.bg : DEFAULT_QR_SETTINGS.bg;

  let logo: string | null = null;
  if (typeof input.logo === "string" && input.logo.startsWith("data:image/")) {
    if (input.logo.length > 400_000) return { ok: false, error: "That logo is too large." };
    logo = input.logo;
  }

  const logoSize =
    typeof input.logoSize === "number" ? Math.min(0.34, Math.max(0.1, input.logoSize)) : 0.22;

  const value: QrSettings = {
    fg,
    bg,
    logo,
    logoSize,
    rounded: input.rounded !== false,
  };

  await execute(
    `INSERT INTO qr_codes (id, creation_id, settings, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(creation_id) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`,
    crypto.randomUUID(),
    creationId,
    JSON.stringify(value),
    Date.now(),
  );

  return { ok: true };
}

function toCreation(row: CreationRow, qrSettings: QrSettings): Creation {
  return { ...row, parsedBlocks: parseBlocks(row.blocks), qrSettings };
}

export async function getCreationById(id: string): Promise<Creation | null> {
  const row = await queryOne<CreationRow>("SELECT * FROM creations WHERE id = ?", id);
  if (!row) return null;
  return toCreation(row, await getQrSettings(row.id));
}

export async function getCreationBySlug(slug: string): Promise<Creation | null> {
  const row = await queryOne<CreationRow>("SELECT * FROM creations WHERE slug = ?", slug);
  if (!row) return null;
  return toCreation(row, await getQrSettings(row.id));
}

export async function getCreationForOwner(
  id: string,
  owner: Owner,
): Promise<Creation | null> {
  const filter = ownerFilter(owner);
  const row = await queryOne<CreationRow>(
    `SELECT * FROM creations WHERE id = ? AND ${filter.clause}`,
    id,
    ...filter.params,
  );
  if (!row) return null;
  return toCreation(row, await getQrSettings(row.id));
}

export async function listCreations(
  owner: Owner,
): Promise<(CreationRow & { scan_count: number })[]> {
  const filter = ownerFilter(owner);
  return queryAll<CreationRow & { scan_count: number }>(
    `SELECT c.*, (SELECT COUNT(*) FROM scans s WHERE s.creation_id = c.id) AS scan_count
     FROM creations c
     WHERE ${filter.clause.replace(/\b(user_id|guest_token)\b/g, "c.$1")}
     ORDER BY c.updated_at DESC`,
    ...filter.params,
  );
}

export async function countOwnedCreations(owner: Owner): Promise<number> {
  const filter = ownerFilter(owner);
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*) AS count FROM creations WHERE ${filter.clause}`,
    ...filter.params,
  );
  return Number(row?.count ?? 0);
}

async function uniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = randomSlug(12);
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM creations WHERE slug = ?",
      slug,
    );
    if (!existing) return slug;
  }
  throw new Error("Could not allocate a unique link. Please try again.");
}

async function syncMedia(
  creationId: string,
  owner: Owner,
  blocks: StoredBlock[],
): Promise<void> {
  const wanted = new Set(
    blocks
      .filter((block) => block.type === "image" || block.type === "video" || block.type === "file")
      .map((block) => (block as { mediaId: string }).mediaId),
  );

  const owned = owner.userId
    ? { clause: "owner_user_id = ?", params: [owner.userId] }
    : { clause: "owner_guest_token = ?", params: [owner.guestToken ?? "__none__"] };

  const attached = await queryAll<MediaRow>(
    `SELECT * FROM media WHERE creation_id = ?`,
    creationId,
  );

  for (const row of attached) {
    if (!wanted.has(row.id)) {
      await deleteMediaObjects([row]);
      await execute("DELETE FROM media WHERE id = ?", row.id);
    }
  }

  for (const mediaId of wanted) {
    await execute(
      `UPDATE media SET creation_id = ?
       WHERE id = ? AND ${owned.clause} AND (creation_id IS NULL OR creation_id = ?)`,
      creationId,
      mediaId,
      ...owned.params,
      creationId,
    );
  }
}

export async function saveCreation(
  input: SaveCreationInput,
  owner: Owner,
): Promise<SaveCreationResult> {
  const title = sanitizeText(input.title, LIMITS.title);
  const subtitle = sanitizeText(input.subtitle, LIMITS.subtitle);
  const accessType = ACCESS_TYPES.includes(input.accessType as AccessType)
    ? (input.accessType as AccessType)
    : null;

  if (!accessType) return { ok: false, error: "Choose an access setting." };

  const { blocks, error } = validateBlocks(input.blocks);
  if (error) return { ok: false, error };

  const mediaIds = blocks
    .filter((block) => block.type === "image" || block.type === "video" || block.type === "file")
    .map((block) => (block as { mediaId: string }).mediaId);

  if (mediaIds.length > 0) {
    const placeholders = mediaIds.map(() => "?").join(",");
    const ownerClause = owner.userId ? "owner_user_id = ?" : "owner_guest_token = ?";
    const rows = await queryAll<{ id: string }>(
      `SELECT id FROM media WHERE id IN (${placeholders}) AND ${ownerClause}`,
      ...mediaIds,
      ...(owner.userId ? [owner.userId] : [owner.guestToken ?? "__none__"]),
    );
    const found = new Set(rows.map((row) => row.id));
    const missing = [...new Set(mediaIds)].some((id) => !found.has(id));
    if (missing) {
      return { ok: false, error: "One of your uploads could not be verified. Please re-upload it." };
    }
  }

  const contentTitle = title || (subtitle ? subtitle : "Untitled page");
  const contentType = detectContentType(blocks);
  const now = Date.now();

  let expiresAt: number | null = null;
  if (typeof input.expiresAt === "number" && Number.isFinite(input.expiresAt)) {
    expiresAt = input.expiresAt;
    if (expiresAt <= now) return { ok: false, error: "The expiry date must be in the future." };
  }

  const passwordValue = typeof input.password === "string" ? input.password : "";
  let passwordHash: string | null = null;

  if (accessType === "password") {
    if (input.clearPassword || !passwordValue) {
      const existing = input.id
        ? await queryOne<{ password_hash: string | null }>(
            "SELECT password_hash FROM creations WHERE id = ?",
            input.id,
          )
        : null;
      passwordHash = existing?.password_hash ?? null;
      if (!passwordHash) return { ok: false, error: "Set a password for this page." };
    } else {
      if (passwordValue.length < 4) {
        return { ok: false, error: "Passwords need at least 4 characters." };
      }
      passwordHash = await hashPassword(passwordValue.slice(0, LIMITS.password));
    }
  }

  const blocksJson = JSON.stringify(blocks);

  if (input.id) {
    const filter = ownerFilter(owner);
    const existing = await queryOne<CreationRow>(
      `SELECT * FROM creations WHERE id = ? AND ${filter.clause}`,
      input.id,
      ...filter.params,
    );
    if (!existing) return { ok: false, error: "That page could not be found." };

    await execute(
      `UPDATE creations
       SET title = ?, subtitle = ?, content_type = ?, blocks = ?, access_type = ?,
           password_hash = ?, expires_at = ?, updated_at = ?
       WHERE id = ?`,
      contentTitle,
      subtitle || null,
      contentType,
      blocksJson,
      accessType,
      passwordHash,
      expiresAt,
      now,
      existing.id,
    );

    await syncMedia(existing.id, owner, blocks);
    const updated = await getCreationById(existing.id);
    if (!updated) return { ok: false, error: "That page could not be found." };
    return { ok: true, creation: updated };
  }

  const slug = await uniqueSlug();
  const id = newId();

  await execute(
    `INSERT INTO creations (id, user_id, guest_token, slug, title, subtitle, content_type, blocks, access_type, password_hash, published, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    id,
    owner.userId,
    owner.userId ? null : owner.guestToken,
    slug,
    contentTitle,
    subtitle || null,
    contentType,
    blocksJson,
    accessType,
    passwordHash,
    expiresAt,
    now,
    now,
  );

  await syncMedia(id, owner, blocks);
  await saveQrSettings(id, DEFAULT_QR_SETTINGS);

  const created = await getCreationById(id);
  if (!created) return { ok: false, error: "Could not publish this page. Please try again." };
  return { ok: true, creation: created };
}

export async function setPublished(
  id: string,
  owner: Owner,
  published: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const filter = ownerFilter(owner);
  const existing = await queryOne<CreationRow>(
    `SELECT id FROM creations WHERE id = ? AND ${filter.clause}`,
    id,
    ...filter.params,
  );
  if (!existing) return { ok: false, error: "That page could not be found." };

  await execute(
    "UPDATE creations SET published = ?, updated_at = ? WHERE id = ?",
    published ? 1 : 0,
    Date.now(),
    id,
  );
  return { ok: true };
}

export async function deleteCreation(
  id: string,
  owner: Owner,
): Promise<{ ok: boolean; error?: string }> {
  const filter = ownerFilter(owner);
  const existing = await queryOne<CreationRow>(
    `SELECT id FROM creations WHERE id = ? AND ${filter.clause}`,
    id,
    ...filter.params,
  );
  if (!existing) return { ok: false, error: "That page could not be found." };

  const media = await queryAll<MediaRow>("SELECT * FROM media WHERE creation_id = ?", id);
  await deleteMediaObjects(media);

  await execute("DELETE FROM media WHERE creation_id = ?", id);
  await execute("DELETE FROM scans WHERE creation_id = ?", id);
  await execute("DELETE FROM qr_codes WHERE creation_id = ?", id);
  await execute("DELETE FROM creations WHERE id = ?", id);

  return { ok: true };
}

export async function claimGuestWork(userId: string, guestToken: string | null): Promise<void> {
  if (!guestToken) return;
  await execute(
    "UPDATE creations SET user_id = ?, guest_token = NULL WHERE guest_token = ?",
    userId,
    guestToken,
  );
  await execute(
    "UPDATE media SET owner_user_id = ?, owner_guest_token = NULL WHERE owner_guest_token = ?",
    userId,
    guestToken,
  );
}

export function unlockCookieName(creationId: string): string {
  return `pk_unlock_${creationId}`;
}

export async function isUnlocked(creationId: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(unlockCookieName(creationId))?.value;
  if (!token) return false;
  const secret = await getAppSecret();
  const expected = await signToken(creationId, secret);
  return timingSafeEqual(token, expected);
}

export async function grantUnlock(creationId: string): Promise<void> {
  const secret = await getAppSecret();
  const token = await signToken(creationId, secret);
  const store = await cookies();
  store.set(unlockCookieName(creationId), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

/** Access metadata only — no content and no password hash. */
export type CreationGate = {
  id: string;
  user_id: string | null;
  guest_token: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  content_type: ContentType;
  access_type: AccessType;
  published: number;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
};

export async function getCreationGate(slug: string): Promise<CreationGate | null> {
  return queryOne<CreationGate>(
    `SELECT id, user_id, guest_token, slug, title, subtitle, content_type, access_type,
            published, expires_at, created_at, updated_at
     FROM creations WHERE slug = ?`,
    slug,
  );
}

/** Content is loaded separately, only once a visitor is allowed to see it. */
export async function getCreationBlocks(slug: string): Promise<Block[]> {
  const row = await queryOne<{ blocks: string }>(
    "SELECT blocks FROM creations WHERE slug = ?",
    slug,
  );
  return row ? parseBlocks(row.blocks) : [];
}

export function isOwnerOf(
  creation: { user_id: string | null; guest_token: string | null },
  owner: Owner,
): boolean {
  if (owner.userId && creation.user_id === owner.userId) return true;
  if (!creation.user_id && owner.guestToken && creation.guest_token === owner.guestToken) {
    return true;
  }
  return false;
}
