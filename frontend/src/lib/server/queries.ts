import "server-only";
import { stroopsToCop } from "@/lib/money";
import { hashAdminToken, isAdminTokenFormat } from "./crypto";
import {
  db,
  type DistributionRow,
  type MemberRow,
  type PaymentRow,
  type ProjectRow,
  type TopupRow,
} from "./db";
import { tryCopPerXlm } from "./price";
import { getAvailableStroops } from "./stellar";

// Las columnas *_secret_enc nunca salen de este módulo hacia la UI.
const PROJECT_PUBLIC = "id, slug, name, kind, stellar_public_key, created_at";
const MEMBER_PUBLIC = "id, project_id, name, phone, role, share_bps, stellar_public_key, created_at";

export type Project = Omit<ProjectRow, "stellar_secret_enc">;
export type Member = Omit<MemberRow, "stellar_secret_enc">;
export type Payer = { display_name: string; username: string };
export type Payment = PaymentRow & { payer: Payer };
export type PaymentWithSplits = Payment & {
  distributions: (DistributionRow & { member: Pick<Member, "id" | "name" | "role"> })[];
};

const PAYMENT_WITH_SPLITS =
  "*, payer:users!payments_payer_id_fkey(display_name, username), distributions(*, member:members(id, name, role))";

function orThrow<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return orThrow(
    await db().from("projects").select(PROJECT_PUBLIC).eq("slug", slug).maybeSingle<Project>(),
  );
}

/** Proyecto al que da acceso un link de administración, o null si el token no es válido. */
export async function getProjectByAdminToken(token: string): Promise<Project | null> {
  if (!isAdminTokenFormat(token)) return null;
  return orThrow(
    await db()
      .from("projects")
      .select(PROJECT_PUBLIC)
      .eq("admin_token_hash", hashAdminToken(token))
      .maybeSingle<Project>(),
  );
}

export async function getProjectMembers(projectId: string): Promise<Member[]> {
  return orThrow(
    await db()
      .from("members")
      .select(MEMBER_PUBLIC)
      .eq("project_id", projectId)
      .order("share_bps", { ascending: false })
      .order("created_at")
      .returns<Member[]>(),
  );
}

export async function getProjectPayments(projectId: string): Promise<PaymentWithSplits[]> {
  return orThrow(
    await db()
      .from("payments")
      .select(PAYMENT_WITH_SPLITS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .returns<PaymentWithSplits[]>(),
  );
}

export async function getPayment(paymentId: string): Promise<PaymentWithSplits | null> {
  if (!isUuid(paymentId)) return null;
  return orThrow(
    await db()
      .from("payments")
      .select(PAYMENT_WITH_SPLITS)
      .eq("id", paymentId)
      .maybeSingle<PaymentWithSplits>(),
  );
}

export type MemberWithProject = Member & { project: Project };

export async function getMember(memberId: string): Promise<MemberWithProject | null> {
  if (!isUuid(memberId)) return null;
  return orThrow(
    await db()
      .from("members")
      .select(`${MEMBER_PUBLIC}, project:projects(${PROJECT_PUBLIC})`)
      .eq("id", memberId)
      .maybeSingle<MemberWithProject>(),
  );
}

export type MemberEarning = DistributionRow & {
  payment: Pick<
    Payment,
    "id" | "payer" | "amount_cop" | "cop_per_xlm" | "distribution_tx_hash" | "created_at"
  >;
};

export async function getMemberEarnings(memberId: string): Promise<MemberEarning[]> {
  return orThrow(
    await db()
      .from("distributions")
      .select(
        "*, payment:payments(id, amount_cop, cop_per_xlm, distribution_tx_hash, created_at, payer:users!payments_payer_id_fkey(display_name, username))",
      )
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .returns<MemberEarning[]>(),
  );
}

export async function getUserTopups(userId: string, limit = 20): Promise<TopupRow[]> {
  return orThrow(
    await db()
      .from("topups")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<TopupRow[]>(),
  );
}

export type Balance = { stroops: bigint | null; cop: number | null };

/** Saldo disponible de una cuenta y su equivalente aproximado en pesos con la tasa de hoy. */
export async function getBalance(publicKey: string): Promise<Balance> {
  const [stroops, rate] = await Promise.all([getAvailableStroops(publicKey), tryCopPerXlm()]);
  return { stroops, cop: stroops === null || rate === null ? null : stroopsToCop(stroops, rate) };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
