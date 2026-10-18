"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { formatCop } from "@/lib/format";
import { parseMembers, type ParsedMember } from "@/lib/members";
import { MAX_PAYMENT_COP, copToStroops, parseCop } from "@/lib/money";
import { canRetryDistribution } from "@/lib/payments";
import { encryptSecret } from "./crypto";
import { db, type PaymentRow, type ProjectKind, type ProjectRow } from "./db";
import {
  executePayment,
  reconcilePayment,
  reconcilePayments,
  recordTopup,
  runDistribution,
} from "./payment-flow";
import { getCopPerXlm } from "./price";
import { getPayment, getProjectAccess, getUsersByUsername, isUuid } from "./queries";
import { requireUser } from "./session";
import { createCustodialAccounts, friendbotTopUp } from "./stellar";

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

/**
 * `requestId` es el id que tendrá el pago o retiro: reenviar el mismo formulario (doble clic)
 * encuentra la fila ya creada en vez de mover dinero dos veces.
 */
export type RequestFormState = FormState & { requestId: string };

/**
 * Pagar = (recarga automática si el saldo no alcanza) → pago a la cuenta del proyecto → reparto.
 * Para quien paga es un solo paso. Ver lib/server/payment-flow.ts.
 */
export async function payProject(
  slug: string,
  prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const user = await requireUser(`/pagar/${encodeURIComponent(slug)}`);
  const receipt = (id: string) => `/pagar/${slug}/recibo/${id}`;
  // Sin fila creada se puede reusar el id; si ya hay un pago con él, el siguiente intento usa otro.
  const keep = (error: string) => ({ error, requestId: prev.requestId });
  const fresh = (error: string) => ({ error, requestId: randomUUID() });

  const requestId = text(formData.get("request_id"), 36);
  if (!isUuid(requestId)) return fresh("Recarga la página e intenta de nuevo.");
  const amountCop = parseCop(text(formData.get("amount"), 20));
  if (amountCop === null || amountCop > MAX_PAYMENT_COP) {
    return keep(`Escribe un monto en pesos, sin decimales, hasta ${formatCop(MAX_PAYMENT_COP)}.`);
  }

  const [{ data: project, error: projectErr }, { data: payer, error: payerErr }, { data: inFlight }] =
    await Promise.all([
      db().from("projects").select("*").eq("slug", slug).maybeSingle<ProjectRow>(),
      db().from("users").select("stellar_secret_enc").eq("id", user.id).single<{ stellar_secret_enc: string }>(),
      db().from("payments").select("*").eq("payer_id", user.id).eq("status", "pending").returns<PaymentRow[]>(),
    ]);
  if (projectErr || !project) return keep("El proyecto no existe.");
  if (payerErr || !payer) return keep("No pudimos leer tu cuenta. Intenta de nuevo.");
  // Un pago que quedó a medias (request cortado) no debe bloquear el siguiente.
  if (inFlight?.length) await reconcilePayments(inFlight);

  // La tasa se congela aquí: el recibo y el historial muestran siempre estos pesos.
  let copPerXlm: number;
  try {
    copPerXlm = await getCopPerXlm();
  } catch (err) {
    return keep((err as Error).message);
  }

  const { data: payment, error: insertErr } = await db()
    .from("payments")
    .insert({
      id: requestId,
      project_id: project.id,
      payer_id: user.id,
      amount_cop: amountCop,
      amount_stroops: copToStroops(amountCop, copPerXlm).toString(),
      cop_per_xlm: copPerXlm,
    })
    .select("*")
    .single<PaymentRow>();
  if (insertErr?.code === "23505" && insertErr.message.includes("payments_pkey")) {
    // Doble clic: este mismo formulario ya creó el pago. Se muestra ese, no se paga otro.
    const { data: existing } = await db()
      .from("payments")
      .select("payer_id, project_id")
      .eq("id", requestId)
      .maybeSingle<Pick<PaymentRow, "payer_id" | "project_id">>();
    if (existing?.payer_id === user.id && existing.project_id === project.id) redirect(receipt(requestId));
    return fresh("Recarga la página e intenta de nuevo.");
  }
  if (insertErr?.code === "23505" && insertErr.message.includes("payments_one_pending_per_payer")) {
    return keep("Ya tienes un pago en curso. Espera a que termine (puede tardar hasta un minuto) y vuelve a intentarlo.");
  }
  if (insertErr || !payment) {
    console.error("No se pudo registrar el pago:", insertErr);
    return keep("No pudimos registrar el pago. Intenta de nuevo.");
  }

  const outcome = await executePayment({
    payment,
    payer: { id: user.id, publicKey: user.stellar_public_key, secretEnc: payer.stellar_secret_enc },
    projectPublicKey: project.stellar_public_key,
  });
  if (outcome.kind === "failed") return fresh(outcome.error);
  // Si el reparto falla, el recibo lo dice y un admin puede reintentarlo.
  if (outcome.kind === "paid") await runDistribution(payment.id);

  redirect(receipt(payment.id));
}

/** Solo admins del proyecto. Al terminar vuelve a la página del proyecto con el resultado. */
export async function retryDistribution(slug: string, paymentId: string): Promise<FormState> {
  const user = await requireUser(`/proyectos/${encodeURIComponent(slug)}`);
  const access = await getProjectAccess(slug, user.id);
  if (!access?.membership?.is_admin) return { error: "Solo los admins pueden reintentar el reparto." };

  let payment = isUuid(paymentId) ? await getPayment(paymentId) : null;
  if (!payment || payment.project_id !== access.project.id) return { error: "El pago no existe." };
  // Si había un reparto en vuelo, primero se averigua si salió: nunca se reparte dos veces.
  if (await reconcilePayment(payment)) {
    payment = (await getPayment(paymentId)) ?? payment;
    if (payment.status === "distributed") redirect(`/proyectos/${slug}?repartido=${paymentId}`);
  }
  if (payment.status === "distributing") {
    return { error: "El reparto ya está en curso. Recarga la página en un minuto." };
  }
  if (!canRetryDistribution(payment, new Date())) {
    return { error: "Este pago no está pendiente de reparto. Recarga la página." };
  }

  // begin_distribution reclama el pago de forma atómica: dos clics no reparten dos veces.
  const outcome = await runDistribution(paymentId);
  if (outcome === "distributed") redirect(`/proyectos/${slug}?repartido=${paymentId}`);
  refresh();
  if (outcome === "busy") return { error: "Otro admin ya está repartiendo este pago. Recarga la página en un momento." };
  if (outcome === "uncertain") {
    return { error: "Enviamos el reparto pero la red aún no lo confirma. Recarga la página en un minuto." };
  }
  const failed = await getPayment(paymentId);
  return { error: failed?.error ?? "No se pudo repartir el pago." };
}

/** "Recargar saldo": en testnet, una ronda de friendbot (~10.000 XLM) fusionada en la wallet. */
export async function topUpBalance(): Promise<FormState> {
  const user = await requireUser("/inicio");
  try {
    const copPerXlm = await getCopPerXlm();
    await friendbotTopUp(user.stellar_public_key, 1n, (round) => recordTopup(user.id, round, copPerXlm));
  } catch (err) {
    console.error("Recarga fallida:", err);
    return { error: "No pudimos recargar tu saldo. Intenta de nuevo en un momento." };
  }
  refresh();
  return { error: null };
}
