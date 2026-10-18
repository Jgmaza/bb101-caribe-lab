"use server";

import { randomBytes } from "node:crypto";
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { MAX_AMOUNT, TOTAL_BPS, percentToBps, splitAmount } from "@/lib/split";
import { decryptSecret, encryptSecret } from "./crypto";
import { db, type MemberRow, type PaymentRow, type ProjectKind, type ProjectRow } from "./db";
import { getProjectBySlug, isUuid } from "./queries";
import {
  createCustodialAccounts,
  distribute,
  fundDemoOrganizer,
  payToProject,
} from "./stellar";
import { env } from "./env";

// Sin auth en el MVP: los proyectos se acceden por su link. Validamos todo lo que llega.

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
  try {
    // Una sola transacción Stellar crea la cuenta del proyecto y las de los integrantes.
    const [projectKp, ...memberKps] = await createCustodialAccounts(members.length + 1);
    const { error } = await db().rpc("create_project", {
      p_slug: slug,
      p_name: name,
      p_kind: kind,
      p_stellar_public_key: projectKp.publicKey(),
      p_stellar_secret_enc: encryptSecret(projectKp.secret()),
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

  redirect(`/proyectos/${slug}`);
}

export async function updateMembers(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const project = await getProjectBySlug(slug);
  if (!project) return { error: "El proyecto no existe." };

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

  revalidatePath(`/proyectos/${slug}`);
  redirect(`/proyectos/${slug}`);
}

export async function payProject(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const payerName = text(formData.get("payer_name"));
  const amount = Number(text(formData.get("amount"), 20).replace(/[.\s$]/g, ""));

  if (payerName.length < 2) return { error: "Escribe quién paga (bar, hotel, organizador)." };
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return { error: "Escribe un monto válido en pesos, sin decimales." };
  }

  const { data: project, error: projectErr } = await db()
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<ProjectRow>();
  if (projectErr || !project) return { error: "El proyecto no existe." };

  const { data: payment, error: insertErr } = await db()
    .from("payments")
    .insert({ project_id: project.id, payer_name: payerName, amount })
    .select("*")
    .single<PaymentRow>();
  if (insertErr || !payment) {
    return { error: `No pudimos registrar el pago. ${insertErr?.message ?? ""}` };
  }

  // 1) Organizador → cuenta del proyecto.
  try {
    const hash = await payToProject({
      payerSecret: env("ORGANIZER_DEMO_SECRET"),
      projectPublicKey: project.stellar_public_key,
      amount,
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

  revalidatePath(`/proyectos/${slug}`);
  redirect(`/pagar/${slug}/recibo/${payment.id}`);
}

export async function retryDistribution(paymentId: string): Promise<void> {
  if (!isUuid(paymentId)) return;
  // Reclama el pago de forma atómica para que dos clics no repartan dos veces.
  const { data: claimed } = await db()
    .from("payments")
    .update({ status: "received", error: null })
    .eq("id", paymentId)
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
      payment.amount,
      members.map((m) => ({ id: m.id, shareBps: m.share_bps })),
    );
    const byId = new Map(members.map((m) => [m.id, m]));

    const hash = (distributedHash = await distribute({
      projectSecret: decryptSecret(project.stellar_secret_enc),
      splits: splits.map((s) => ({ publicKey: byId.get(s.id)!.stellar_public_key, amount: s.amount })),
      memo: memoFor(payment.id),
    }));

    const { error } = await db().rpc("record_distribution", {
      p_payment_id: payment.id,
      p_distribution_tx_hash: hash,
      p_rows: splits.map((s) => ({ member_id: s.id, share_bps: s.shareBps, amount: s.amount })),
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

export async function fundOrganizer(): Promise<void> {
  await fundDemoOrganizer(5_000_000);
  refresh();
}

function memoFor(paymentId: string) {
  return `orilla ${paymentId.slice(0, 8)}`;
}
