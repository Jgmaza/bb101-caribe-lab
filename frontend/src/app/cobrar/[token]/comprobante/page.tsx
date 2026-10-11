import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { formatCop, workerDemo } from "@/lib/mock";

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell
        left={
          <Link href={`/cobrar/${token}/pago`} className="text-lg font-semibold">
            ←
          </Link>
        }
        showLogo
      >
        <h1 className="font-display text-[28px] font-bold text-ink">
          Comprobante
        </h1>

        <div className="mt-4 rounded-2xl border border-line bg-bg-soft p-5">
          <p className="font-display text-[30px] font-bold text-ink">
            {formatCop(workerDemo.monto)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{workerDemo.evento}</p>

          <dl className="mt-4 space-y-2.5 text-xs">
            {[
              ["Fecha", "11 oct 2026 · 22:41"],
              ["Receptor", workerDemo.nombre],
              ["Destino", `${workerDemo.banco} · ${workerDemo.cuenta}`],
              ["Hash (mock)", workerDemo.hash],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <a
          href="https://stellar.expert/explorer/testnet"
          target="_blank"
          rel="noreferrer"
          className="mt-4 block"
        >
          <span className="inline-flex w-full items-center justify-center rounded-[10px] border border-line bg-white px-5 py-3.5 text-[15px] font-semibold text-ink">
            Abrir explorador Stellar
          </span>
        </a>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Pago registrado en Stellar (testnet) · esta es la prueba compartida
          del pago — no depende del Excel del hotel.
        </p>

        <LinkButton href={`/cobrar/${token}/pago`} variant="ghost" className="mt-5 w-full">
          Volver al saldo Orilla
        </LinkButton>
      </MobileShell>
    </div>
  );
}
