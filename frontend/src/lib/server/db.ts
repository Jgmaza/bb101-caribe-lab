import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MemberSnapshot } from "@/lib/members";
import type { PaymentState } from "@/lib/payments";
import { env } from "./env";

let client: SupabaseClient | undefined;

/**
 * Next memoiza los GET con la misma URL durante un render: leer de nuevo una fila después de
 * cambiarla (p. ej. al reconciliar un pago) devolvería la respuesta vieja. Una señal propia
 * por request lo desactiva (ver la sección "Memoization" de la referencia de fetch).
 */
const unmemoizedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? new AbortController().signal });

/** Cliente con service role: solo se usa en el servidor. RLS bloquea todo lo demás. */
export function db(): SupabaseClient {
  client ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: unmemoizedFetch },
  });
  return client;
}

export type ProjectKind = "banda" | "staff" | "otro";

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  stellar_public_key: string;
  stellar_secret_enc: string;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  kind: ProjectKind;
  stellar_public_key: string;
  stellar_secret_enc: string;
  created_by: string;
  created_at: string;
};

export type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  share_bps: number;
  is_admin: boolean;
  created_at: string;
};

export type ShareChangeRow = {
  id: string;
  project_id: string;
  changed_by: string;
  before: MemberSnapshot[];
  after: MemberSnapshot[];
  created_at: string;
};

// Las columnas bigint de stroops llegan como number desde PostgREST. Son exactas porque los
// montos están acotados (MAX_PAYMENT_COP, recargas de 10.000 XLM) muy por debajo de 2^53;
// para operar se convierten con BigInt().

/** Estados y transiciones: ver src/lib/payments.ts. */
export type PaymentRow = PaymentState & {
  id: string;
  project_id: string;
  payer_id: string;
  amount_cop: number;
  amount_stroops: number;
  cop_per_xlm: number;
  topup_tx_hash: string | null;
  error: string | null;
};

export type DistributionRow = {
  id: string;
  payment_id: string;
  user_id: string;
  share_bps: number;
  amount_stroops: number;
  created_at: string;
};

export type TopupRow = {
  id: string;
  user_id: string;
  amount_stroops: number;
  cop_per_xlm: number;
  tx_hash: string;
  source: "prueba" | "banco";
  /** Recarga automática hecha para cubrir este pago; null si fue manual. */
  payment_id: string | null;
  created_at: string;
};
