import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// Las claves secretas de las cuentas custodiales se guardan cifradas con AES-256-GCM.
// Formato: v1.<iv>.<tag>.<ciphertext>, cada parte en base64url.

function key(): Buffer {
  const raw = Buffer.from(env("ORILLA_ENCRYPTION_KEY"), "base64");
  if (raw.length !== 32) {
    throw new Error("ORILLA_ENCRYPTION_KEY debe ser 32 bytes en base64");
  }
  return raw;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(sealed: string): string {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    throw new Error("Secreto cifrado con formato inválido");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// Link de administración del proyecto: quien tiene el token administra el proyecto.
// Solo se guarda su sha256; el token en claro vive únicamente en el link.

export function newAdminToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isAdminTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function hashAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
