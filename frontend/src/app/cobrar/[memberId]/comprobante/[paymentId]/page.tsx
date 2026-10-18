import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { formatCop, formatDateTime, shortHash } from "@/lib/format";
import { getMember, getPayment } from "@/lib/server/queries";
import { explorerTxUrl } from "@/lib/server/stellar";
import { bpsToPercent } from "@/lib/split";

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ memberId: string; paymentId: string }>;
}) {
  const { memberId, paymentId } = await params;
  const [member, payment] = await Promise.all([getMember(memberId), getPayment(paymentId)]);
  const mine = payment?.distributions.find((d) => d.member_id === memberId);
  if (!member || !payment || !mine || !payment.distribution_tx_hash) notFound();

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell
        left={
          <Link href={`/cobrar/${member.id}/saldo`} className="text-lg font-semibold">
            ←
          </Link>
        }
        showLogo
      >
        <h1 className="font-display text-[28px] font-bold text-ink">Comprobante</h1>

        <div className="mt-4 rounded-2xl border border-line bg-bg-soft p-5">
          <p className="font-display text-[30px] font-bold text-ink">{formatCop(mine.amount)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {bpsToPercent(mine.share_bps)}% de {formatCop(payment.amount)} · {member.project.name}
          </p>

          <dl className="mt-4 space-y-2.5 text-xs">
            {[
              ["Fecha", formatDateTime(payment.created_at)],
              ["Pagó", payment.payer_name],
              ["Receptor", member.name],
              ["Transacción", shortHash(payment.distribution_tx_hash)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <a
          href={explorerTxUrl(payment.distribution_tx_hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center rounded-[10px] border border-line bg-white px-5 py-3.5 text-[15px] font-semibold text-ink"
        >
          Abrir explorador Stellar
        </a>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Pago registrado en Stellar (testnet). Esta es la prueba compartida del
          pago: la ven igual tú, tu grupo y quien pagó.
        </p>

        <LinkButton href={`/cobrar/${member.id}/saldo`} variant="ghost" className="mt-5 w-full">
          Volver al saldo Orilla
        </LinkButton>
      </MobileShell>
    </div>
  );
}
