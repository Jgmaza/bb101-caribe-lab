import "server-only";
import { stroopsToCop } from "@/lib/money";
import { paymentPhase } from "@/lib/payments";
import {
  db,
  type DistributionRow,
  type PaymentRow,
  type ProjectMemberRow,
  type ProjectRow,
  type ShareChangeRow,
  type TopupRow,
  type WithdrawalRow,
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

/**
 * Pagos que llegaron (o pudieron llegar) a la cuenta del proyecto. Los intentos que nunca
 * salieron de la cuenta de quien paga no le incumben al grupo: solo los ve quien pagó.
 */
export async function getProjectPayments(projectId: string): Promise<PaymentWithSplits[]> {
  return orThrow(
    await db()
      .from("payments")
      .select(PAYMENT_WITH_SPLITS)
      .eq("project_id", projectId)
      .not("payment_tx_hash", "is", null)
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

/** Rondas de la recarga automática hecha para cubrir un pago. */
export async function getPaymentTopups(paymentId: string): Promise<TopupRow[]> {
  return orThrow(
    await db()
      .from("topups")
      .select("*")
      .eq("payment_id", paymentId)
      .order("created_at")
      .returns<TopupRow[]>(),
  );
}

// Retiros: anchor_url lleva un token de sesión del anchor; solo se muestra a su dueño.
export async function getWithdrawal(id: string): Promise<WithdrawalRow | null> {
  if (!isUuid(id)) return null;
  return orThrow(await db().from("withdrawals").select("*").eq("id", id).maybeSingle<WithdrawalRow>());
}

export type Movement = {
  id: string;
  kind: "cobro" | "pago" | "recarga" | "retiro";
  title: string;
  /** En pesos con la tasa congelada de la operación; negativo si salió de tu saldo. */
  amountCop: number;
  at: string;
  href: string | null;
  txHash: string | null;
  /** Para lo que no terminó: "Enviando", "No se completó", … */
  note: string | null;
};

const WITHDRAWAL_NOTE: Partial<Record<WithdrawalRow["status"], string>> = {
  interactive: "Falta completar",
  ready: "Falta confirmar",
  sending: "Enviando",
  processing: "En proceso",
  failed: "No se completó",
};

type ReceivedRow = {
  id: string;
  amount_stroops: number;
  created_at: string;
  payment: Pick<PaymentRow, "id" | "cop_per_xlm" | "distribution_tx_hash"> & {
    project: Pick<Project, "slug" | "name">;
  };
};
type PaidRow = Pick<PaymentRow, "id" | "status" | "amount_cop" | "payment_tx_hash" | "created_at"> & {
  project: Pick<Project, "slug" | "name">;
};

/** Historial de /inicio: cobros, pagos, recargas y retiros, del más reciente al más antiguo. */
export async function getUserMovements(userId: string, limit = 20): Promise<Movement[]> {
  const [received, paid, topups, withdrawals] = await Promise.all([
    db()
      .from("distributions")
      .select(
        "id, amount_stroops, created_at, payment:payments!inner(id, cop_per_xlm, distribution_tx_hash, project:projects(slug, name))",
      )
      .eq("user_id", userId)
      .eq("payment.status", "distributed")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<ReceivedRow[]>(),
    db()
      .from("payments")
      .select("id, status, amount_cop, payment_tx_hash, created_at, project:projects(slug, name)")
      .eq("payer_id", userId)
      .not("payment_tx_hash", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<PaidRow[]>(),
    getUserTopups(userId, limit),
    db()
      .from("withdrawals")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<WithdrawalRow[]>(),
  ]);

  const movements: Movement[] = [
    ...orThrow(received).map((d) => ({
      id: `cobro-${d.id}`,
      kind: "cobro" as const,
      title: `Cobro de ${d.payment.project.name}`,
      amountCop: stroopsToCop(BigInt(d.amount_stroops), d.payment.cop_per_xlm),
      at: d.created_at,
      href: `/pagar/${d.payment.project.slug}/recibo/${d.payment.id}`,
      txHash: d.payment.distribution_tx_hash,
      note: null,
    })),
    ...orThrow(paid).map((p) => {
      const phase = paymentPhase({
        status: p.status,
        payment_tx_hash: p.payment_tx_hash,
        distribution_tx_hash: null,
        tx_deadline: null,
        created_at: p.created_at,
      });
      const noteByPhase: Partial<Record<typeof phase, string>> = {
        processing: "Procesando",
        confirming: "Confirmando",
        received: "Falta repartir",
        distributing: "Repartiendo",
        payment_failed: "No salió",
        distribution_failed: "Falló el reparto",
      };
      return {
        id: `pago-${p.id}`,
        kind: "pago" as const,
        title: `Pago a ${p.project.name}`,
        amountCop: -p.amount_cop,
        at: p.created_at,
        href: `/pagar/${p.project.slug}/recibo/${p.id}`,
        txHash: p.status === "pending" ? null : p.payment_tx_hash,
        note: noteByPhase[phase] ?? null,
      };
    }),
    ...topups.map((t) => ({
      id: `recarga-${t.id}`,
      kind: "recarga" as const,
      title: t.payment_id ? "Recarga automática al pagar" : "Recarga de saldo",
      amountCop: stroopsToCop(BigInt(t.amount_stroops), t.cop_per_xlm),
      at: t.created_at,
      href: null,
      txHash: t.tx_hash,
      note: null,
    })),
    ...orThrow(withdrawals).map((w) => ({
      id: `retiro-${w.id}`,
      kind: "retiro" as const,
      title: w.kind === "banco" ? "Retiro a tu banco" : "Retiro a otra cuenta",
      amountCop: -(w.amount_stroops ? stroopsToCop(BigInt(w.amount_stroops), w.cop_per_xlm) : w.amount_cop),
      at: w.created_at,
      href: `/retirar/${w.id}`,
      txHash: w.status === "processing" || w.status === "completed" ? w.stellar_tx_hash : null,
      note: WITHDRAWAL_NOTE[w.status] ?? null,
    })),
  ];
  return movements.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
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
