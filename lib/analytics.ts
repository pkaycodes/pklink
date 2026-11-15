import { headers } from "next/headers";
import { execute, queryAll, queryOne } from "./db";
import { getAppSecret } from "./app-settings";
import { sha256Hex } from "./security";
import type { ScanRow, ScanStats } from "./types";

export function deviceFromUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(ua)) return "mobile";
  if (!ua || ua === "curl" || /bot|crawler|spider|preview/.test(ua)) return "desktop";
  return "desktop";
}

export async function recordView(creationId: string): Promise<void> {
  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") ?? "";
    const forwarded = headerList.get("x-forwarded-for") ?? "";
    const ip = headerList.get("cf-connecting-ip") ?? forwarded.split(",")[0]?.trim() ?? "unknown";
    const country = headerList.get("cf-ipcountry");
    const referrer = (headerList.get("referer") ?? "").slice(0, 300) || null;
    const device = deviceFromUserAgent(userAgent);
    const secret = await getAppSecret();
    const visitorHash = (await sha256Hex(`${ip}|${userAgent}|${secret}`)).slice(0, 32);

    await execute(
      `INSERT INTO scans (id, creation_id, created_at, device, country, referrer, visitor_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      creationId,
      Date.now(),
      device,
      country ? country.toUpperCase().slice(0, 2) : null,
      referrer,
      visitorHash,
    );
  } catch (error) {
    console.error("Failed to record scan", error);
  }
}

export async function getScanStats(creationId: string): Promise<ScanStats> {
  const totals = await queryOne<{
    total: number;
    unique_visitors: number;
    last: number | null;
  }>(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT visitor_hash) AS unique_visitors, MAX(created_at) AS last
     FROM scans WHERE creation_id = ?`,
    creationId,
  );

  const devices = await queryAll<{ device: string | null; count: number }>(
    `SELECT device, COUNT(*) AS count FROM scans WHERE creation_id = ?
     GROUP BY device ORDER BY count DESC`,
    creationId,
  );

  const countries = await queryAll<{ country: string | null; count: number }>(
    `SELECT country, COUNT(*) AS count FROM scans WHERE creation_id = ? AND country IS NOT NULL
     GROUP BY country ORDER BY count DESC LIMIT 6`,
    creationId,
  );

  const dailyRows = await queryAll<{ day: string; count: number }>(
    `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS count
     FROM scans WHERE creation_id = ? AND created_at >= ?
     GROUP BY day ORDER BY day ASC`,
    creationId,
    Date.now() - 13 * 24 * 60 * 60 * 1000,
  );

  const recent = await queryAll<ScanRow>(
    "SELECT * FROM scans WHERE creation_id = ? ORDER BY created_at DESC LIMIT 10",
    creationId,
  );

  const counts = new Map(dailyRows.map((row) => [row.day, Number(row.count)]));
  const daily: { day: string; count: number }[] = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    daily.push({ day: key, count: counts.get(key) ?? 0 });
  }

  return {
    total: Number(totals?.total ?? 0),
    unique: Number(totals?.unique_visitors ?? 0),
    devices: devices.map((row) => ({ device: row.device ?? "unknown", count: Number(row.count) })),
    countries: countries.map((row) => ({ country: row.country ?? "unknown", count: Number(row.count) })),
    daily,
    recent,
    lastScanAt: totals?.last ? Number(totals.last) : null,
  };
}

export async function getScanTotal(creationId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM scans WHERE creation_id = ?",
    creationId,
  );
  return Number(row?.count ?? 0);
}
