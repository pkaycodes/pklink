import { execute, queryOne } from "./db";

let cachedSecret: string | null = null;

/**
 * A per-install signing secret, generated on first use and kept in the database.
 * Used to sign unlock cookies and to salt visitor hashes.
 */
export async function getAppSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const existing = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'app_secret'",
  );
  if (existing?.value) {
    cachedSecret = existing.value;
    return cachedSecret;
  }

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  await execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('app_secret', ?)", secret);

  const stored = await queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'app_secret'",
  );
  cachedSecret = stored?.value ?? secret;
  return cachedSecret;
}
