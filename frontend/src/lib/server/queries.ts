import "server-only";
import { stroopsToCop } from "@/lib/money";
import {
  db,
  type DistributionRow,
  type PaymentRow,
  type ProjectMemberRow,
  type ProjectRow,
  type ShareChangeRow,
  type TopupRow,
} from "./db";
import { tryCopPerXlm } from "./price";
import { getAvailableStroops } from "./stellar";

// Las columnas *_secret_enc nunca salen de este módulo hacia la UI.
const PROJECT_PUBLIC = "id, slug, name, kind, stellar_public_key, created_by, created_at";

export type Project = Omit<ProjectRow, "stellar_secret_enc">;
export type PersonRef = { id: string; username: string; display_name: string };
export type ProjectMember = ProjectMemberRow & { user: PersonRef };
export type Payer = { display_name: string; username: string };
export type Payment = PaymentRow & { payer: Payer };
export type PaymentWithSplits = Payment & {
  distributions: (DistributionRow & { user: PersonRef })[];
};
export type ShareChange = ShareChangeRow & { author: PersonRef };

const PERSON = "id, username, display_name";
const PAYMENT_WITH_SPLITS = `*, payer:users!payments_payer_id_fkey(display_name, username), distributions(*, user:users(${PERSON}))`;

function orThrow<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return orThrow(
    await db().from("projects").select(PROJECT_PUBLIC).eq("slug", slug).maybeSingle<Project>(),
  );
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return orThrow(
    await db()
      .from("project_members")
      .select(`*, user:users(${PERSON})`)
      .eq("project_id", projectId)
      .order("share_bps", { ascending: false })
      .order("created_at")
      .returns<ProjectMember[]>(),
  );
}

/**
 * Proyecto y la membresía de `userId` en él. `membership` es null si no es integrante:
 * las páginas del proyecto responden 404 para no revelar que existe.
 */
export async function getProjectAccess(
  slug: string,
  userId: string,
): Promise<{ project: Project; membership: ProjectMemberRow | null } | null> {
  const project = await getProjectBySlug(slug);
  if (!project) return null;
  const membership = orThrow(
    await db()
      .from("project_members")
      .select("*")
      .eq("project_id", project.id)
      .eq("user_id", userId)
      .maybeSingle<ProjectMemberRow>(),
  );
  return { project, membership };
}

export type UserProject = Pick<ProjectMemberRow, "role" | "share_bps" | "is_admin"> & {
  project: Pick<Project, "id" | "slug" | "name" | "kind">;
};

export async function getUserProjects(userId: string): Promise<UserProject[]> {
  return orThrow(
    await db()
      .from("project_members")
      .select("role, share_bps, is_admin, project:projects(id, slug, name, kind)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<UserProject[]>(),
  );
}

export async function getShareChanges(projectId: string, limit = 30): Promise<ShareChange[]> {
  return orThrow(
    await db()
      .from("share_changes")
      .select(`*, author:users(${PERSON})`)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<ShareChange[]>(),
  );
}

/** Usuarios por @usuario (ya normalizados). Los que no existen no vienen en el resultado. */
export async function getUsersByUsername(usernames: string[]): Promise<PersonRef[]> {
  if (usernames.length === 0) return [];
  return orThrow(
    await db().from("users").select(PERSON).in("username", usernames).returns<PersonRef[]>(),
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
