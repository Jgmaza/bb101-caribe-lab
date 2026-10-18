// Reglas de usuario y contraseña. Sin dependencias de servidor: los formularios
// las usan para avisar antes de enviar y las acciones para validar de verdad.

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignora lo que pase de 72 bytes

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function usernameError(username: string): string | null {
  return USERNAME_PATTERN.test(username)
    ? null
    : "El usuario debe tener entre 3 y 20 letras sin tildes, números o _.";
}

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "La contraseña es demasiado larga.";
  }
  return null;
}

export function displayNameError(name: string): string | null {
  return name.length >= 2 && name.length <= 60
    ? null
    : "Escribe tu nombre (entre 2 y 60 caracteres).";
}

/** Destino después de ingresar: solo rutas internas, para no redirigir a otro sitio. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/inicio";
  }
  return next;
}
