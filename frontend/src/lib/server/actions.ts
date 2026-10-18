"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { formatCop } from "@/lib/format";
import { parseMembers, type ParsedMember } from "@/lib/members";
import { MAX_PAYMENT_COP, copToStroops, parseCop } from "@/lib/money";
import { splitAmount } from "@/lib/split";
import { decryptSecret, encryptSecret } from "./crypto";
import { db, type PaymentRow, type ProjectKind, type ProjectRow } from "./db";
import { getCopPerXlm } from "./price";
import { getProjectAccess, getUsersByUsername, isUuid } from "./queries";
import { requireUser } from "./session";
import {
  createCustodialAccounts,
  distribute,
  friendbotTopUp,
  getAvailableStroops,
  payToProject,
} from "./stellar";

// Todas las acciones exigen sesión (requireUser). Editar un proyecto y reintentar un reparto
// exigen además ser admin del proyecto. Validamos todo lo que llega.

export type FormState = { error: string | null };
/** Devuelve lo escrito: React resetea los campos no controlados del formulario tras la acción. */
export type ProjectFormState = FormState & { name?: string; kind?: string };

const KINDS: ProjectKind[] = ["banda", "staff", "otro"];

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

type MemberRpcRow = Omit<ParsedMember, "username"> & { user_id: string };

/** Cambia cada @usuario por su id. Solo personas registradas pueden ser integrantes. */
async function resolveMembers(
  members: ParsedMember[],
): Promise<{ rows: MemberRpcRow[] } | { error: string }> {
  const users = await getUsersByUsername(members.map((m) => m.username));
  const ids = new Map(users.map((u) => [u.username, u.id]));
  const missing = members.filter((m) => !ids.has(m.username)).map((m) => `@${m.username}`);
  if (missing.length) {
    return {
      error: `No encontramos a ${missing.join(", ")}. Cada integrante necesita una cuenta en Orilla.`,
    };
  }
  return {
    rows: members.map(({ username, ...m }) => ({ ...m, user_id: ids.get(username)! })),
  };
}

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser("/proyectos/nuevo");
  const name = text(formData.get("name"));
  const kind = text(formData.get("kind")) as ProjectKind;
  const fail = (error: string) => ({ error, name, kind });

  if (name.length < 2) return fail("Escribe el nombre del proyecto.");
  if (!KINDS.includes(kind)) return fail("Elige el tipo de proyecto.");

  const parsed = parseMembers(parseJsonArray(formData.get("members")));
  if (!parsed.ok) return fail(parsed.error);
  if (!parsed.members.some((m) => m.username === user.username && m.is_admin)) {
    return fail("Tú quedas como integrante y admin del proyecto: no te quites de la lista.");
  }
  const resolved = await resolveMembers(parsed.members);
  if ("error" in resolved) return fail(resolved.error);

  const slug = slugify(name);
  try {
    // Solo se crea la cuenta del proyecto: el reparto va a la wallet de cada usuario.
    const [projectKp] = await createCustodialAccounts(1);
    const { error } = await db().rpc("create_project", {
      p_slug: slug,
      p_name: name,
      p_kind: kind,
      p_stellar_public_key: projectKp.publicKey(),
      p_stellar_secret_enc: encryptSecret(projectKp.secret()),
      p_created_by: user.id,
      p_members: resolved.rows,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    return fail(`No pudimos crear el proyecto. ${(err as Error).message}`);
  }

  redirect(`/proyectos/${slug}`);
}

/** Reemplaza integrantes, %, roles y admins. Solo admins; queda en el historial de cambios. */
export async function updateProjectMembers(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/proyectos/${encodeURIComponent(slug)}/editar`);
  const access = await getProjectAccess(slug, user.id);
  if (!access?.membership) return { error: "El proyecto no existe." };
  if (!access.membership.is_admin) return { error: "Solo los admins pueden editar el proyecto." };

  const parsed = parseMembers(parseJsonArray(formData.get("members")));
  if (!parsed.ok) return { error: parsed.error };
  const resolved = await resolveMembers(parsed.members);
  if ("error" in resolved) return resolved;

  // La función vuelve a revisar que quien edita sea admin, dentro de la misma transacción.
  const { error } = await db().rpc("update_project_members", {
    p_project_id: access.project.id,
    p_changed_by: user.id,
    p_members: resolved.rows,
  });
  if (error?.code === "42501") return { error: "Solo los admins pueden editar el proyecto." };
  if (error) return { error: `No pudimos guardar los cambios. ${error.message}` };

  // Si se quitó a sí mismo del proyecto, ya no puede verlo.
  const stillMember = resolved.rows.some((m) => m.user_id === user.id);
  redirect(stillMember ? `/proyectos/${slug}` : "/inicio");
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

/** Solo admins del proyecto. */
export async function retryDistribution(slug: string, paymentId: string): Promise<void> {
  if (!isUuid(paymentId)) return;
  const user = await requireUser(`/proyectos/${encodeURIComponent(slug)}`);
  const access = await getProjectAccess(slug, user.id);
  if (!access?.membership?.is_admin) return;
  // Reclama el pago de forma atómica para que dos clics no repartan dos veces.
  const { data: claimed } = await db()
    .from("payments")
    .update({ status: "received", error: null })
    .eq("id", paymentId)
    .eq("project_id", access.project.id)
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

    // Los % vigentes al momento del reparto; cada parte va a la wallet del usuario.
    const [{ data: project }, { data: members }] = await Promise.all([
      db().from("projects").select("*").eq("id", payment.project_id).single<ProjectRow>(),
      db()
        .from("project_members")
        .select("user_id, share_bps, user:users(stellar_public_key)")
        .eq("project_id", payment.project_id)
        .returns<{ user_id: string; share_bps: number; user: { stellar_public_key: string } }[]>(),
    ]);
    if (!project || !members?.length) throw new Error("Proyecto sin integrantes");

    const splits = splitAmount(
      BigInt(payment.amount_stroops),
      members.map((m) => ({ id: m.user_id, shareBps: m.share_bps })),
    );
    const byId = new Map(members.map((m) => [m.user_id, m]));

    const hash = (distributedHash = await distribute({
      projectSecret: decryptSecret(project.stellar_secret_enc),
      splits: splits.map((s) => ({
        publicKey: byId.get(s.id)!.user.stellar_public_key,
        amountStroops: s.amount,
      })),
      memo: memoFor(payment.id),
    }));

    const { error } = await db().rpc("record_distribution", {
      p_payment_id: payment.id,
      p_distribution_tx_hash: hash,
      p_rows: splits.map((s) => ({
        user_id: s.id,
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
