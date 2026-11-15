"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { execute, queryOne } from "@/lib/db";
import {
  claimGuestWork,
  countOwnedCreations,
  deleteCreation,
  getCreationBySlug,
  saveCreation,
  saveQrSettings,
  setPublished,
  type SaveCreationInput,
} from "@/lib/creations";
import {
  createSession,
  destroyCurrentSession,
  getCurrentUser,
  getGuestToken,
  getOwner,
  GUEST_COOKIE,
} from "@/lib/auth";
import { hashPassword, newId, verifyPassword } from "@/lib/security";
import { grantUnlock, unlockCookieName } from "@/lib/creations";
import { getCreationById } from "@/lib/creations";
import type { AccessType, Block, UserRow } from "@/lib/types";

const GUEST_LIMIT = 5;

type SavePayload = {
  id?: string | null;
  title: string;
  subtitle?: string;
  blocks: Block[];
  accessType: AccessType;
  password?: string;
  expiresAt?: number | null;
};

type SaveResponse =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

export async function saveCreationAction(payload: SavePayload): Promise<SaveResponse> {
  const owner = await getOwner();
  if (!owner.userId && !owner.guestToken) {
    return { ok: false, error: "Your session has expired. Refresh the page and try again." };
  }

  if (!payload.id) {
    const owned = await countOwnedCreations(owner);
    if (!owner.userId && owned >= GUEST_LIMIT) {
      return {
        ok: false,
        error: `Guest pages are limited to ${GUEST_LIMIT}. Create a free account to publish more.`,
      };
    }
  }

  const input: SaveCreationInput = {
    id: payload.id ?? null,
    title: payload.title,
    subtitle: payload.subtitle ?? "",
    blocks: payload.blocks,
    accessType: payload.accessType,
    password: payload.password ?? "",
    expiresAt: payload.expiresAt ?? null,
  };

  const result = await saveCreation(input, owner);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/dashboard");
  revalidatePath(`/p/${result.creation.slug}`);

  return { ok: true, id: result.creation.id, slug: result.creation.slug };
}

export async function deleteCreationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const owner = await getOwner();
  const creation = await getCreationById(id);
  const result = await deleteCreation(id, owner);
  if (result.ok) {
    revalidatePath("/dashboard");
    if (creation) revalidatePath(`/p/${creation.slug}`);
  }
  return result;
}

export async function setPublishedAction(
  id: string,
  published: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const owner = await getOwner();
  const creation = await getCreationById(id);
  const result = await setPublished(id, owner, published);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${id}`);
    if (creation) revalidatePath(`/p/${creation.slug}`);
  }
  return result;
}

export async function saveQrAction(
  id: string,
  settings: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const owner = await getOwner();
  const creation = await getCreationById(id);
  if (!creation) return { ok: false, error: "That page could not be found." };
  const owns =
    (owner.userId && creation.user_id === owner.userId) ||
    (!creation.user_id && owner.guestToken && creation.guest_token === owner.guestToken);
  if (!owns) return { ok: false, error: "That page could not be found." };

  return saveQrSettings(id, settings);
}

export async function unlockAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const password = String(formData.get("password") ?? "");
  const creation = await getCreationBySlug(slug);

  if (!creation || creation.access_type !== "password") {
    redirect(`/p/${slug}`);
  }

  const valid = await verifyPassword(password, creation.password_hash);
  if (!valid) {
    redirect(`/p/${slug}?error=1`);
  }

  await grantUnlock(creation.id);
  redirect(`/p/${slug}`);
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`/signup?error=${encodeURIComponent("Enter a valid email address.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Use at least 8 characters for your password.")}`);
  }

  const existing = await queryOne<UserRow>("SELECT * FROM users WHERE email = ?", email);
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("An account with that email already exists.")}`);
  }

  const id = newId();
  await execute(
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    id,
    email,
    await hashPassword(password),
    Date.now(),
  );

  await createSession(id);
  const guestToken = await getGuestToken();
  await claimGuestWork(id, guestToken);

  const store = await cookies();
  if (guestToken) store.delete(GUEST_COOKIE);

  redirect("/dashboard");
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await queryOne<UserRow>("SELECT * FROM users WHERE email = ?", email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    redirect(`/login?error=${encodeURIComponent("That email and password combination is wrong.")}`);
  }

  await createSession(user.id);
  const guestToken = await getGuestToken();
  await claimGuestWork(user.id, guestToken);

  const store = await cookies();
  if (guestToken) store.delete(GUEST_COOKIE);

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/");
}

export async function clearUnlockAction(creationId: string): Promise<void> {
  const store = await cookies();
  store.delete(unlockCookieName(creationId));
}

export async function currentUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email ?? null;
}
