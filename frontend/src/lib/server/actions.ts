"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { formatCop, isValidPhone, normalizePhone } from "@/lib/format";
import { MAX_PAYMENT_COP, copToStroops, parseCop } from "@/lib/money";
import { TOTAL_BPS, percentToBps, splitAmount } from "@/lib/split";
import { decryptSecret, encryptSecret, hashAdminToken, newAdminToken } from "./crypto";
import { db, type MemberRow, type PaymentRow, type ProjectKind, type ProjectRow } from "./db";
import { getCopPerXlm } from "./price";
import { getProjectByAdminToken, isUuid } from "./queries";
import { requireUser } from "./session";
import {
  createCustodialAccounts,
  distribute,
  friendbotTopUp,
  getAvailableStroops,
  payToProject,
} from "./stellar";

// Crear proyecto y pagar exigen sesión (requireUser). Mientras se migra a proyectos con
// admins, la administración sigue por link (/panel/<token>) y el cobro por /cobrar/<uuid>.
// Validamos todo lo que llega.

export type FormState = { error: string | null };

const MAX_MEMBERS = 20;
const KINDS: ProjectKind[] = ["banda", "staff", "otro"];

type MemberInput = { name: string; phone: string; role: string; pct: string };

function parseJsonArray(value: FormDataEntryValue | null): unknown[] | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "proyecto"}-${randomBytes(3).toString("hex")}`;
}

function sharesError(bps: (number | null)[]): string | null {
  if (bps.some((b) => b === null || b < 1 || b > TOTAL_BPS)) {
    return "Cada porcentaje debe ser un número entre 0,01 y 100 (máximo dos decimales).";
  }
  const sum = (bps as number[]).reduce((a, b) => a + b, 0);
  if (sum !== TOTAL_BPS) {
    return `Los porcentajes deben sumar 100% (hoy suman ${(sum / 100).toLocaleString("es-CO")}%).`;
  }
  return null;
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("/proyectos/nuevo");
  const name = text(formData.get("name"));
  const kind = text(formData.get("kind")) as ProjectKind;
  const raw = parseJsonArray(formData.get("members"));

  if (name.length < 2) return { error: "Escribe el nombre del proyecto." };
  if (!KINDS.includes(kind)) return { error: "Elige el tipo de proyecto." };
  if (!raw || raw.length < 1) return { error: "Agrega al menos un integrante." };
  if (raw.length > MAX_MEMBERS) return { error: `Máximo ${MAX_MEMBERS} integrantes por proyecto.` };

  const members = (raw as Partial<MemberInput>[]).map((m) => ({
    name: text(m.name),
    phone: normalizePhone(text(m.phone, 30)),
    role: text(m.role, 60),
    share_bps: percentToBps(text(m.pct, 10)),
  }));

  if (members.some((m) => m.name.length < 2)) return { error: "Cada integrante necesita un nombre." };
  if (members.some((m) => !isValidPhone(m.phone))) {
    return { error: "Revisa los celulares: deben tener entre 10 y 12 dígitos." };
  }
  if (new Set(members.map((m) => m.phone)).size !== members.length) {
    return { error: "Hay celulares repetidos en el proyecto." };
  }
  const shareErr = sharesError(members.map((m) => m.share_bps));
  if (shareErr) return { error: shareErr };

  const slug = slugify(name);
  const adminToken = newAdminToken();
  try {
    // Una sola transacción Stellar crea la cuenta del proyecto y las de los integrantes.
    const [projectKp, ...memberKps] = await createCustodialAccounts(members.length + 1);
    const { error } = await db().rpc("create_project", {
      p_slug: slug,
      p_name: name,
      p_kind: kind,
      p_stellar_public_key: projectKp.publicKey(),
      p_stellar_secret_enc: encryptSecret(projectKp.secret()),
      p_admin_token_hash: hashAdminToken(adminToken),
      p_members: members.map((m, i) => ({
        ...m,
        stellar_public_key: memberKps[i].publicKey(),
        stellar_secret_enc: encryptSecret(memberKps[i].secret()),
      })),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    return { error: `No pudimos crear el proyecto. ${(err as Error).message}` };
  }

  // El token en claro solo existe en este link: el panel avisa que hay que guardarlo.
  redirect(`/panel/${adminToken}?nuevo=1`);
}

export async function updateMembers(
  adminToken: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const project = await getProjectByAdminToken(adminToken);
  if (!project) return { error: "Link de administración inválido." };

  const raw = parseJsonArray(formData.get("members"));
  if (!raw || raw.length < 1) return { error: "No llegaron integrantes." };

  const members = (raw as { id?: unknown; name?: unknown; role?: unknown; pct?: unknown }[]).map(
    (m) => ({
      id: text(m.id, 40),
      name: text(m.name),
      role: text(m.role, 60),
      share_bps: percentToBps(text(m.pct, 10)),
    }),
  );
  if (members.some((m) => !isUuid(m.id))) return { error: "Integrante inválido." };
  if (members.some((m) => m.name.length < 2)) return { error: "Cada integrante necesita un nombre." };
  const shareErr = sharesError(members.map((m) => m.share_bps));
  if (shareErr) return { error: shareErr };

  const { error } = await db().rpc("update_members", {
    p_project_id: project.id,
    p_members: members,
  });
  if (error) return { error: `No pudimos guardar los cambios. ${error.message}` };

  redirect(`/panel/${adminToken}`);
}

export async function payProject(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/pagar/${encodeURIComponent(slug)}`);
  const amountCop = parseCop(text(formData.get("amount"), 20));
  if (amountCop === null || amountCop > MAX_PAYMENT_COP) {
    return { error: `Escribe un monto en pesos, sin decimales, hasta ${formatCop(MAX_PAYMENT_COP)}.` };
  }

  const [{ data: project, error: projectErr }, { data: payer, error: payerErr }] = await Promise.all([
    db().from("projects").select("*").eq("slug", slug).maybeSingle<ProjectRow>(),
    db().from("users").select("stellar_secret_enc").eq("id", user.id).single<{ stellar_secret_enc: string }>(),
  ]);
  if (projectErr || !project) return { error: "El proyecto no existe." };
  if (payerErr || !payer) return { error: "No pudimos leer tu cuenta. Intenta de nuevo." };

  // La tasa se congela aquí: el recibo y el historial muestran siempre estos pesos.
  let copPerXlm: number;
  try {
    copPerXlm = await getCopPerXlm();
  } catch (err) {
    return { error: (err as Error).message };
  }
  const amountStroops = copToStroops(amountCop, copPerXlm);

  const available = await getAvailableStroops(user.stellar_public_key);
  if (available === null) return { error: "No pudimos consultar tu saldo. Intenta de nuevo." };
  if (available < amountStroops) {
    return { error: "Tu saldo no alcanza para este pago. Recarga desde tu inicio y vuelve a intentarlo." };
  }

  const { data: payment, error: insertErr } = await db()
    .from("payments")
    .insert({
      project_id: project.id,
      payer_id: user.id,
      amount_cop: amountCop,
      amount_stroops: amountStroops.toString(),
      cop_per_xlm: copPerXlm,
    })
    .select("*")
    .single<PaymentRow>();
  if (insertErr || !payment) {
    return { error: `No pudimos registrar el pago. ${insertErr?.message ?? ""}` };
  }

  // 1) Quien paga → cuenta del proyecto.
  try {
    const hash = await payToProject({
      payerSecret: decryptSecret(payer.stellar_secret_enc),
      projectPublicKey: project.stellar_public_key,
      amountStroops,
      memo: memoFor(payment.id),
    });
    await db()
      .from("payments")
      .update({ status: "received", payment_tx_hash: hash })
      .eq("id", payment.id);
  } catch (err) {
    const message = (err as Error).message;
    await db().from("payments").update({ status: "failed", error: message }).eq("id", payment.id);
    return { error: `El pago no salió. ${message}` };
  }

  // 2) Cuenta del proyecto → integrantes. Si falla, el pago queda "failed" y se puede reintentar.
  await runDistribution(payment.id);

  redirect(`/pagar/${slug}/recibo/${payment.id}`);
}

export async function retryDistribution(adminToken: string, paymentId: string): Promise<void> {
  if (!isUuid(paymentId)) return;
  const project = await getProjectByAdminToken(adminToken);
  if (!project) return;
  // Reclama el pago de forma atómica para que dos clics no repartan dos veces.
  const { data: claimed } = await db()
    .from("payments")
    .update({ status: "received", error: null })
    .eq("id", paymentId)
    .eq("project_id", project.id)
    .eq("status", "failed")
    .not("payment_tx_hash", "is", null)
    .select("id, project_id");
  if (!claimed?.length) return;

  await runDistribution(paymentId);
  refresh();
}

async function runDistribution(paymentId: string) {
  let distributedHash: string | null = null;
  try {
    const { data: payment, error: payErr } = await db()
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single<PaymentRow>();
    if (payErr || !payment) throw new Error(payErr?.message ?? "Pago no encontrado");

    const [{ data: project }, { data: members }] = await Promise.all([
      db().from("projects").select("*").eq("id", payment.project_id).single<ProjectRow>(),
      db().from("members").select("*").eq("project_id", payment.project_id).returns<MemberRow[]>(),
    ]);
    if (!project || !members?.length) throw new Error("Proyecto sin integrantes");

    const splits = splitAmount(
      BigInt(payment.amount_stroops),
      members.map((m) => ({ id: m.id, shareBps: m.share_bps })),
    );
    const byId = new Map(members.map((m) => [m.id, m]));

    const hash = (distributedHash = await distribute({
      projectSecret: decryptSecret(project.stellar_secret_enc),
      splits: splits.map((s) => ({
        publicKey: byId.get(s.id)!.stellar_public_key,
        amountStroops: s.amount,
      })),
      memo: memoFor(payment.id),
    }));

    const { error } = await db().rpc("record_distribution", {
      p_payment_id: payment.id,
      p_distribution_tx_hash: hash,
      p_rows: splits.map((s) => ({
        member_id: s.id,
        share_bps: s.shareBps,
        amount_stroops: s.amount.toString(),
      })),
    });
    if (error) throw new Error(`Repartido en Stellar (${hash}) pero no se pudo registrar: ${error.message}`);
  } catch (err) {
    // Si el reparto ya salió en Stellar, no se marca "failed": reintentar pagaría dos veces.
    await db()
      .from("payments")
      .update(
        distributedHash
          ? { error: (err as Error).message }
          : { status: "failed", error: (err as Error).message },
      )
      .eq("id", paymentId);
  }
}

/** "Recargar saldo": en testnet, una ronda de friendbot (~10.000 XLM) fusionada en la wallet. */
export async function topUpBalance(): Promise<FormState> {
  const user = await requireUser("/inicio");
  try {
    const copPerXlm = await getCopPerXlm();
    const rounds = await friendbotTopUp(user.stellar_public_key);
    const { error } = await db()
      .from("topups")
      .insert(
        rounds.map((r) => ({
          user_id: user.id,
          amount_stroops: r.amountStroops.toString(),
          cop_per_xlm: copPerXlm,
          tx_hash: r.txHash,
          source: "prueba",
        })),
      );
    if (error) throw new Error(`La recarga llegó pero no se pudo registrar: ${error.message}`);
  } catch (err) {
    console.error("Recarga fallida:", err);
    return { error: "No pudimos recargar tu saldo. Intenta de nuevo en un momento." };
  }
  refresh();
  return { error: null };
}

function memoFor(paymentId: string) {
  return `orilla ${paymentId.slice(0, 8)}`;
}
