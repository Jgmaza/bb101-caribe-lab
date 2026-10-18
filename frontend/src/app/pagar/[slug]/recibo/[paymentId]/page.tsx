import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LinkButton, StatusChip, TxLink } from "@/components/ui";
import { formatCop, formatDateTime } from "@/lib/format";
import { getPayment, getProjectBySlug } from "@/lib/server/queries";
import { bpsToPercent } from "@/lib/split";

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ slug: string; paymentId: string }>;
}) {
  const { slug, paymentId } = await params;
  const [project, payment] = await Promise.all([getProjectBySlug(slug), getPayment(paymentId)]);
  if (!project || !payment || payment.project_id !== project.id) notFound();

  const ok = payment.status === "distributed";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-4 py-12">
      <div className="w-full max-w-[560px] rounded-[18px] border border-line bg-white p-6 shadow-sm sm:p-9">
        <Logo href="/" />
        <div className="mt-6 flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
              ok ? "bg-[#E6F6EF] text-success" : "bg-[#FCEAEA] text-danger"
            }`}
            aria-hidden
          >
            {ok ? "✓" : "!"}
          </div>
          <div>
            <h1 className="font-display text-[28px] font-bold text-ink">
              {ok
                ? "Pago repartido"
                : payment.payment_tx_hash
                  ? "El pago llegó, falta repartir"
                  : "El pago no salió"}
            </h1>
            <StatusChip status={payment.status} />
          </div>
        </div>

        <p className="mt-4 text-[15px] text-ink-muted">
          {payment.payer_name} pagó{" "}
          <strong className="text-ink">{formatCop(payment.amount)}</strong> a{" "}
          {project.name} · {formatDateTime(payment.created_at)}
        </p>

        {payment.distributions.length > 0 ? (
          <ul className="mt-5 space-y-2 rounded-xl bg-bg-soft p-4 text-[13px]">
            {[...payment.distributions]
              .sort((a, b) => b.amount - a.amount)
              .map((d) => (
                <li key={d.id} className="flex justify-between gap-4">
                  <span className="text-ink-muted">
                    {d.member.name} · {bpsToPercent(d.share_bps)}%
                  </span>
                  <span className="font-semibold text-ink">{formatCop(d.amount)}</span>
                </li>
              ))}
          </ul>
        ) : null}

        {payment.error ? (
          <p className="mt-4 text-xs text-danger">
            {payment.error} El grupo puede reintentar el reparto desde su panel.
          </p>
        ) : null}

        <dl className="mt-5 space-y-2 text-xs">
          {payment.payment_tx_hash ? (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Pago al proyecto</dt>
              <dd>
                <TxLink hash={payment.payment_tx_hash} />
              </dd>
            </div>
          ) : null}
          {payment.distribution_tx_hash ? (
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
            Hacer otro pago
          </LinkButton>
          <LinkButton href={`/proyectos/${slug}`}>Ver proyecto</LinkButton>
        </div>
      </div>
    </div>
  );
}
