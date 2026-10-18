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

export type PaymentRow = {
  id: string;
  project_id: string;
  payer_name: string;
  amount: number;
  status: PaymentStatus;
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
  amount: number;
  created_at: string;
};
