"use server";

import { redirect } from "next/navigation";
import {
  displayNameError,
  normalizeUsername,
  passwordError,
  safeNext,
  usernameError,
} from "@/lib/auth";
import { encryptSecret } from "./crypto";
import { db } from "./db";
import { checkCredentials, endSession, hashPassword, startSession } from "./session";
import { createCustodialAccounts } from "./stellar";

export type AuthFormState = { error: string | null; username?: string; displayName?: string };

function field(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
}

function usernameTaken(username: string) {
  return `El username @${username} ya está en uso. Elige otro.`;
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = normalizeUsername(field(formData, "username", 40));
  const displayName = field(formData, "display_name", 80).trim();
  const password = field(formData, "password", 200);
  const passwordConfirm = field(formData, "password_confirm", 200);
  const echo = { username, displayName };

  const invalid = usernameError(username) ?? displayNameError(displayName) ?? passwordError(password);
  if (invalid) return { error: invalid, ...echo };
  if (password !== passwordConfirm) return { error: "Las contraseñas no coinciden.", ...echo };

  // Se revisa antes de crear la wallet para no gastar XLM del funder en un usuario repetido.
  // El unique de users.username (23505 abajo) cubre dos registros simultáneos.
  const { data: taken } = await db().from("users").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: usernameTaken(username), ...echo };

  let userId: string;
  try {
    const [passwordHash, [account]] = await Promise.all([
      hashPassword(password),
      createCustodialAccounts(1),
    ]);
    const { data, error } = await db()
      .from("users")
      .insert({
        username,
        display_name: displayName,
        password_hash: passwordHash,
        stellar_public_key: account.publicKey(),
        stellar_secret_enc: encryptSecret(account.secret()),
      })
      .select("id")
      .single<{ id: string }>();
    if (error?.code === "23505") return { error: usernameTaken(username), ...echo };
    if (error || !data) throw new Error(error?.message ?? "sin respuesta");
    userId = data.id;
    await startSession(userId);
  } catch (err) {
    console.error("Registro fallido:", err);
    return { error: "No pudimos crear tu cuenta. Intenta de nuevo en un momento.", ...echo };
  }

  redirect(safeNext(field(formData, "next", 300)));
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = normalizeUsername(field(formData, "username", 40));
  const password = field(formData, "password", 200);

  try {
    const user = await checkCredentials(username, password);
    if (!user) return { error: "Username o contraseña incorrectos.", username };
    await startSession(user.id);
  } catch (err) {
    console.error("Ingreso fallido:", err);
    return { error: "No pudimos iniciar tu sesión. Intenta de nuevo en un momento.", username };
  }

  redirect(safeNext(field(formData, "next", 300)));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
