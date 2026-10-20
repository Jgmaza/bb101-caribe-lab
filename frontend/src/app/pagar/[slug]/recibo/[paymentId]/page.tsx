import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Logo } from "@/components/Logo";
import { LinkButton, StatusChip, TxLink } from "@/components/ui";
import { formatCop, formatDateTime } from "@/lib/format";
import { stroopsToCop } from "@/lib/money";
import { paymentPhase, type PaymentPhase } from "@/lib/payments";
import { reconcilePayment } from "@/lib/server/payment-flow";
import { getPayment, getPaymentTopups, getProjectAccess } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { bpsToPercent } from "@/lib/split";

const POLLING: PaymentPhase[] = ["processing", "confirming", "distributing", "received"];

const TITLE: Record<PaymentPhase, string> = {
  processing: "Procesando el pago",
  confirming: "Confirmando el pago",
  received: "El pago llegó, falta repartir",
  distributing: "Repartiendo el pago",
  distributed: "Pago repartido",
  payment_failed: "El pago no salió",
  distribution_failed: "El pago llegó, falta repartir",
};

/**
 * Lo ven quien pagó y los integrantes del proyecto. A los demás, 404 (como la página del
 * proyecto): el recibo dice quién pagó, cuánto y cuánto recibió cada integrante.
 */
export default async function ReciboPage({
  params,
}: {
  params: Promise<{ slug: string; paymentId: string }>;
}) {
  const { slug, paymentId } = await params;
  const user = await requireUser(`/pagar/${encodeURIComponent(slug)}/recibo/${encodeURIComponent(paymentId)}`);
  const [access, found] = await Promise.all([getProjectAccess(slug, user.id), getPayment(paymentId)]);
  if (!access || !found || found.project_id !== access.project.id) notFound();
  const isPayer = found.payer_id === user.id;
  if (!isPayer && !access.membership) notFound();
  const { project, membership } = access;

  // Si quedó algo en vuelo (p. ej. la red no confirmó a tiempo), se averigua ahora.
  const payment = (await reconcilePayment(found)) ? ((await getPayment(paymentId)) ?? found) : found;
  const topups = isPayer ? await getPaymentTopups(payment.id) : [];
  const phase = paymentPhase(payment);
  const ok = phase === "distributed";
  const failed = phase === "payment_failed" || phase === "distribution_failed";
  const topupStroops = topups.reduce((acc, t) => acc + BigInt(t.amount_stroops), 0n);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-4 py-12">
      {POLLING.includes(phase) ? <AutoRefresh seconds={4} /> : null}
      <div className="w-full max-w-[560px] rounded-[18px] border border-line bg-white p-6 shadow-sm sm:p-9">
        <Logo href="/inicio" />
        <div className="mt-6 flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
              ok ? "bg-[#E6F6EF] text-success" : failed ? "bg-[#FCEAEA] text-danger" : "bg-[#E8F4FA] text-blue"
            }`}
            aria-hidden
          >
            {ok ? "✓" : failed ? "!" : "…"}
          </div>
          <div>
            <h1 className="font-display text-[28px] font-bold text-ink">{TITLE[phase]}</h1>
            <StatusChip phase={phase} />
          </div>
        </div>

        <p className="mt-4 text-[15px] text-ink-muted">
          {isPayer ? "Pagaste" : `${payment.payer.display_name} pagó`}{" "}
          <strong className="text-ink">{formatCop(payment.amount_cop)}</strong> a{" "}
          {project.name} · {formatDateTime(payment.created_at)}
        </p>

        {ok ? (
          <ul className="mt-5 space-y-2 rounded-xl bg-bg-soft p-4 text-[13px]">
            {[...payment.distributions]
              .sort((a, b) => b.amount_stroops - a.amount_stroops)
              .map((d) => (
                <li key={d.id} className="flex justify-between gap-4">
                  <span className="text-ink-muted">
                    {d.user.display_name} · {bpsToPercent(d.share_bps)}%
                  </span>
                  <span className="font-semibold text-ink">
                    {formatCop(stroopsToCop(BigInt(d.amount_stroops), payment.cop_per_xlm))}
                  </span>
                </li>
              ))}
          </ul>
        ) : null}

        <StatusMessage
          phase={phase}
          error={payment.error}
          isAdmin={!!membership?.is_admin}
          projectHref={membership ? `/proyectos/${slug}` : null}
        />

        {topups.length > 0 ? (
          <div className="mt-5 rounded-xl border border-line p-4 text-[13px]">
            <p className="font-semibold text-ink">
              Recargamos tu saldo antes de pagar: +{formatCop(stroopsToCop(topupStroops, payment.cop_per_xlm))}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Saldo de prueba. Lo que no se usó en este pago queda en tu saldo.
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {topups.map((t, i) => (
                <li key={t.id} className="text-xs text-ink-muted">
                  Recarga{topups.length > 1 ? ` ${i + 1}` : ""}: <TxLink hash={t.tx_hash} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <dl className="mt-5 space-y-2 text-xs">
          {payment.payment_tx_hash && phase !== "confirming" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Pago al proyecto</dt>
              <dd>
                <TxLink hash={payment.payment_tx_hash} />
              </dd>
            </div>
          ) : null}
          {payment.distribution_tx_hash && ok ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Reparto a integrantes</dt>
              <dd>
                <TxLink hash={payment.distribution_tx_hash} />
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href={`/pagar/${slug}`} variant="ghost">
            {phase === "payment_failed" ? "Intentar de nuevo" : "Hacer otro pago"}
          </LinkButton>
          <LinkButton href="/inicio" variant="ghost">
            Mi inicio
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function StatusMessage({
  phase,
  error,
  isAdmin,
  projectHref,
}: {
  phase: PaymentPhase;
  error: string | null;
  isAdmin: boolean;
  projectHref: string | null;
}) {
  if (phase === "distributed") return null;
  const base = "mt-4 rounded-[10px] px-3.5 py-3 text-[13px]";

  if (phase === "processing" || phase === "confirming" || phase === "distributing" || phase === "received") {
    return (
      <p className={`${base} bg-[#E8F4FA] text-ink`}>
        {phase === "distributing" || phase === "received"
          ? "Estamos confirmando el reparto con la red."
          : "Estamos confirmando tu pago con la red."}{" "}
        Esta página se actualiza sola.
      </p>
    );
  }
  if (phase === "payment_failed") {
    return <p className={`${base} bg-[#FCEAEA] text-danger`}>{error ?? "El pago no salió."}</p>;
  }
  // El pago llegó a la cuenta del proyecto pero no se repartió: nadie tiene que volver a pagar.
  return (
    <div className={`${base} bg-[#FCEAEA] text-danger`}>
      <p>{error ?? "El pago llegó a la cuenta del proyecto, pero todavía no se ha repartido."}</p>
      <p className="mt-1 text-ink">
        No hay que volver a pagar.{" "}
        {isAdmin && projectHref ? (
          <>
            Como admin, puedes{" "}
            <Link href={projectHref} className="font-semibold text-blue underline">
              reintentar el reparto desde el proyecto
            </Link>
            .
          </>
        ) : (
          "Los admins del proyecto pueden reintentar el reparto."
        )}
      </p>
    </div>
  );
}
