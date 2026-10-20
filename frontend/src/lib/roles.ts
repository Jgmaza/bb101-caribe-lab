/** Roles sugeridos para filas de un lote de evento. */
export const EVENT_ROLES = [
  "músico",
  "staff",
  "cocinero",
  "sonido",
  "seguridad",
  "técnico",
  "barra",
  "producción",
  "otro",
] as const;

export type EventRole = (typeof EVENT_ROLES)[number];

const ALIASES: Record<string, EventRole> = {
  musico: "músico",
  músico: "músico",
  musician: "músico",
  artista: "músico",
  staff: "staff",
  personal: "staff",
  cocinero: "cocinero",
  cocina: "cocinero",
  chef: "cocinero",
  sonido: "sonido",
  audio: "sonido",
  seguridad: "seguridad",
  vigilante: "seguridad",
  tecnico: "técnico",
  técnico: "técnico",
  tech: "técnico",
  barra: "barra",
  bartender: "barra",
  produccion: "producción",
  producción: "producción",
  otro: "otro",
  other: "otro",
};

/** Normaliza texto libre del Excel a un rol conocido, o lo deja como "otro". */
export function normalizeRole(raw: string): string {
  const key = raw.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!key) return "";
  return ALIASES[key] ?? (EVENT_ROLES.includes(raw.trim() as EventRole) ? raw.trim() : raw.trim().slice(0, 60));
}
