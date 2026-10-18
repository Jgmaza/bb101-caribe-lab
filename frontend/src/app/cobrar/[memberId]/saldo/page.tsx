import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { formatBalance, formatCop, formatDateTime } from "@/lib/format";
import { getMember, getMemberEarnings } from "@/lib/server/queries";
import { getCopBalance } from "@/lib/server/stellar";
import { bpsToPercent } from "@/lib/split";

export default async function SaldoPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const member = await getMember(memberId);
  if (!member) notFound();

  const [earnings, balance] = await Promise.all([
    getMemberEarnings(member.id),
    getCopBalance(member.stellar_public_key),
  ]);
  const last = earnings[0];

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell showLogo>
        <div className="rounded-[18px] bg-orilla-gradient p-5 text-white">
          <p className="text-[13px] font-semibold text-white/85">{member.project.name}</p>
          {last ? (
            <>
              <h1 className="mt-1 font-display text-[34px] font-bold leading-none">
                Te pagaron
              </h1>
              <p className="mt-2 font-display text-[42px] font-bold leading-none">
                {formatCop(last.amount)}
              </p>
              <p className="mt-3 text-[13px] text-white/90">
                {last.payment.payer_name} · {formatDateTime(last.created_at)}
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-1 font-display text-[30px] font-bold leading-tight">
                Aún no hay pagos
              </h1>
              <p className="mt-2 text-[13px] text-white/90">
                Cuando paguen al proyecto, tu parte llega aquí al instante.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-[14px] bg-bg-soft p-4">
          <dl className="space-y-3 text-[13px]">
            {[
              ["Saldo Orilla", formatBalance(balance)],
              ["Tu parte", `${bpsToPercent(member.share_bps)}% del proyecto`],
              ["Rol", member.role || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <LinkButton href={`/cobrar/${member.id}/banco`} className="w-full">
            Enviar a Bancolombia
          </LinkButton>
          {last ? (
            <LinkButton
              href={`/cobrar/${member.id}/comprobante/${last.payment.id}`}
              variant="ghost"
              className="w-full"
            >
              Ver comprobante
            </LinkButton>
          ) : null}
        </div>

        {earnings.length > 0 ? (
          <>
            <h2 className="mt-7 text-sm font-bold text-ink">Historial</h2>
            <ul className="mt-2 divide-y divide-line">
              {earnings.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/cobrar/${member.id}/comprobante/${e.payment.id}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{e.payment.payer_name}</p>
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(e.created_at)} · {bpsToPercent(e.share_bps)}% de{" "}
                        {formatCop(e.payment.amount)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-success">+{formatCop(e.amount)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <p className="mt-6 text-center text-xs text-ink-muted">
          Respaldo en red Stellar · cada pago tiene comprobante público.
        </p>
      </MobileShell>
    </div>
  );
}
