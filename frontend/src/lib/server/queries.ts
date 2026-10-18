import "server-only";
import { hashAdminToken, isAdminTokenFormat } from "./crypto";
import {
  db,
  type DistributionRow,
  type MemberRow,
  type PaymentRow,
  type ProjectRow,
} from "./db";

// Las columnas *_secret_enc nunca salen de este módulo hacia la UI.
const PROJECT_PUBLIC = "id, slug, name, kind, stellar_public_key, created_at";
const MEMBER_PUBLIC = "id, project_id, name, phone, role, share_bps, stellar_public_key, created_at";

export type Project = Omit<ProjectRow, "stellar_secret_enc">;
export type Member = Omit<MemberRow, "stellar_secret_enc">;
export type Payment = PaymentRow;
export type PaymentWithSplits = Payment & {
  distributions: (DistributionRow & { member: Pick<Member, "id" | "name" | "role"> })[];
};

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
      .select("*, distributions(*, member:members(id, name, role))")
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
      .select("*, distributions(*, member:members(id, name, role))")
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
  payment: Pick<Payment, "id" | "payer_name" | "amount" | "distribution_tx_hash" | "created_at">;
};

export async function getMemberEarnings(memberId: string): Promise<MemberEarning[]> {
  return orThrow(
    await db()
      .from("distributions")
      .select("*, payment:payments(id, payer_name, amount, distribution_tx_hash, created_at)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .returns<MemberEarning[]>(),
  );
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
