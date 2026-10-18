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

export const KIND_LABEL = {
  banda: "Banda / grupo musical",
  staff: "Staff de evento",
  otro: "Proyecto",
} as const;

export function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function shortKey(key: string) {
  return `${key.slice(0, 6)}…${key.slice(-6)}`;
}
