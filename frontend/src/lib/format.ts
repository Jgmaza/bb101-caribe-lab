export function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Saldo leído de Stellar: null significa que no se pudo consultar. */
export function formatBalance(value: number | null) {
  return value === null ? "No disponible" : formatCop(value);
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

/** Deja solo dígitos: "300 555-0142" → "3005550142". */
export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPhone(digits: string) {
  return /^[0-9]{10,12}$/.test(digits);
}

export function formatPhone(digits: string) {
  return digits.length === 10
    ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : digits;
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function shortKey(key: string) {
  return `${key.slice(0, 6)}…${key.slice(-6)}`;
}
