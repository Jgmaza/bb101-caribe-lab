import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | undefined;

/** Cliente con service role: solo se usa en el servidor. RLS bloquea todo lo demás. */
export function db(): SupabaseClient {
  client ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export type ProjectKind = "banda" | "staff" | "otro";
export type PaymentStatus = "pending" | "received" | "distributed" | "failed";

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
  created_at: string;
};

export type MemberRow = {
  id: string;
  project_id: string;
  name: string;
  phone: string;
  role: string;
  share_bps: number;
  stellar_public_key: string;
  stellar_secret_enc: string;
  created_at: string;
};

// Las columnas bigint de stroops llegan como number desde PostgREST. Son exactas porque los
// montos están acotados (MAX_PAYMENT_COP, recargas de 10.000 XLM) muy por debajo de 2^53;
// para operar se convierten con BigInt().

export type PaymentRow = {
  id: string;
  project_id: string;
  payer_id: string;
  amount_cop: number;
  amount_stroops: number;
  cop_per_xlm: number;
  status: PaymentStatus;
  topup_tx_hash: string | null;
  payment_tx_hash: string | null;
  distribution_tx_hash: string | null;
  error: string | null;
  created_at: string;
};

export type DistributionRow = {
  id: string;
  payment_id: string;
  member_id: string;
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
  created_at: string;
};
