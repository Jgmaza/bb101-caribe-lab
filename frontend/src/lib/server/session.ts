import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, type UserRow } from "./db";

// Login propio: usuario + contraseña (bcrypt) y sesiones en la tabla `sessions`.
// La cookie lleva un token aleatorio; en la base solo queda su sha256, así un volcado
// de la tabla no sirve para entrar. Cerrar sesión borra la fila.

const COOKIE = "orilla_session";
const SESSION_DAYS = 30;
const BCRYPT_COST = 12;
// Hash de una contraseña cualquiera: se compara cuando el usuario no existe para que
// la respuesta tarde lo mismo y no delate qué usuarios están registrados.
const DUMMY_HASH = "$2b$12$4LDQret8fDEXYWsy8Vliiu/mk4q4We68/7fS9q6RqAeuEQBhWAr/S";

export type User = Omit<UserRow, "password_hash" | "stellar_secret_enc">;
const USER_PUBLIC = "id, username, display_name, stellar_public_key, created_at";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Devuelve el usuario si la contraseña es correcta; null si no (sin decir cuál falló). */
export async function checkCredentials(username: string, password: string): Promise<User | null> {
  const { data, error } = await db()
    .from("users")
    .select(`${USER_PUBLIC}, password_hash`)
    .eq("username", username)
    .maybeSingle<User & { password_hash: string }>();
  if (error) throw new Error(error.message);
  const ok = await bcrypt.compare(password, data?.password_hash ?? DUMMY_HASH);
  if (!data || !ok) return null;
  return {
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    stellar_public_key: data.stellar_public_key,
    created_at: data.created_at,
  };
}

/** Crea la sesión y deja la cookie. Solo en Server Actions o Route Handlers. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await db()
    .from("sessions")
    .insert({ user_id: userId, token_hash: hashToken(token), expires_at: expiresAt.toISOString() });
  if (error) throw new Error(error.message);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db().from("sessions").delete().eq("token_hash", hashToken(token));
  store.delete(COOKIE);
}

/** Usuario de la sesión actual, o null. Se consulta la base en cada request (sesión revocable). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await db()
    .from("sessions")
    .select(`user:users(${USER_PUBLIC})`)
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ user: User }>();
  if (error) throw new Error(error.message);
  return data?.user ?? null;
});

/** Para páginas y acciones que exigen sesión: si no hay, manda a ingresar y vuelve a `next`. */
export async function requireUser(next: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return user;
}
