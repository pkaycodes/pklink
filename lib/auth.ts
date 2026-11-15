import { cookies } from "next/headers";
import { execute, queryOne } from "./db";
import { newId } from "./security";

export const SESSION_COOKIE = "pk_session";
export const GUEST_COOKIE = "pk_guest";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  createdAt: number;
};

export type Owner = {
  userId: string | null;
  guestToken: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await queryOne<{
    id: string;
    email: string;
    created_at: number;
    expires_at: number;
  }>(
    `SELECT u.id AS id, u.email AS email, u.created_at AS created_at, s.expires_at AS expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    sessionId,
  );

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await execute("DELETE FROM sessions WHERE id = ?", sessionId);
    return null;
  }

  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export async function createSession(userId: string): Promise<void> {
  const sessionId = newId();
  const now = Date.now();
  await execute(
    "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    sessionId,
    userId,
    now,
    now + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await execute("DELETE FROM sessions WHERE id = ?", sessionId);
  }
  store.delete(SESSION_COOKIE);
}

export async function getGuestToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function getOwner(): Promise<Owner> {
  const user = await getCurrentUser();
  const guestToken = user ? null : await getGuestToken();
  return { userId: user?.id ?? null, guestToken };
}

export function ownerFilter(owner: Owner): { clause: string; params: unknown[] } {
  if (owner.userId) {
    return { clause: "user_id = ?", params: [owner.userId] };
  }
  if (owner.guestToken) {
    return { clause: "guest_token = ?", params: [owner.guestToken] };
  }
  // Match nothing when there is no identity at all.
  return { clause: "user_id = ? AND guest_token = ?", params: ["__none__", "__none__"] };
}
