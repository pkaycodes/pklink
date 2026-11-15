import { getEnv, type D1Database } from "./cf";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS creations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    guest_token TEXT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    content_type TEXT NOT NULL DEFAULT 'text',
    blocks TEXT NOT NULL DEFAULT '[]',
    access_type TEXT NOT NULL DEFAULT 'public',
    password_hash TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_creations_user ON creations(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_creations_guest ON creations(guest_token)`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    creation_id TEXT,
    owner_user_id TEXT,
    owner_guest_token TEXT,
    r2_key TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_media_creation ON media(creation_id)`,
  `CREATE TABLE IF NOT EXISTS qr_codes (
    id TEXT PRIMARY KEY,
    creation_id TEXT NOT NULL UNIQUE,
    settings TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    creation_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    device TEXT,
    country TEXT,
    referrer TEXT,
    visitor_hash TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scans_creation ON scans(creation_id)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

let ready: Promise<D1Database> | null = null;

async function init(): Promise<D1Database> {
  const { DB } = await getEnv();
  await DB.batch(SCHEMA.map((statement) => DB.prepare(statement)));
  return DB;
}

export async function db(): Promise<D1Database> {
  if (!ready) {
    ready = init().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export async function queryAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  const database = await db();
  const result = await database
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return result.results ?? [];
}

export async function queryOne<T>(sql: string, ...params: unknown[]): Promise<T | null> {
  const database = await db();
  return database
    .prepare(sql)
    .bind(...params)
    .first<T>();
}

export async function execute(sql: string, ...params: unknown[]): Promise<void> {
  const database = await db();
  await database
    .prepare(sql)
    .bind(...params)
    .run();
}
