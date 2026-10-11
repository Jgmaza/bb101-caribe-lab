import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { formatCop, workerDemo } from "@/lib/mock";

export default async function TePagaronPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell showLogo>
        <div className="rounded-[18px] bg-orilla-gradient p-5 text-white">
          <p className="text-[13px] font-semibold text-white/85">
            Hotel Dann Carlton
          </p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-none">
            Te pagaron
          </h1>
          <p className="mt-2 font-display text-[42px] font-bold leading-none">
            {formatCop(workerDemo.monto)}
          </p>
          <p className="mt-3 text-[13px] text-white/90">
            {workerDemo.evento.split("—")[0]?.trim()} · {workerDemo.hora}
          </p>
        </div>

        <div className="mt-4 rounded-[14px] bg-bg-soft p-4">
          <dl className="space-y-3 text-[13px]">
            {[
              ["Rol", workerDemo.rol],
              ["Pagador", workerDemo.pagador],
              ["Saldo Orilla", "Disponible para retirar"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          El dinero ya está en tu <strong className="text-ink">saldo Orilla</strong>.
          Envíalo a Bancolombia cuando quieras — sin jerga crypto.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Respaldo en red Stellar · puedes ver el comprobante.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <LinkButton href={`/cobrar/${token}/banco`} className="w-full">
            Enviar a Bancolombia
          </LinkButton>
          <LinkButton
            href={`/cobrar/${token}/comprobante`}
            variant="ghost"
            className="w-full"
          >
            Ver comprobante
          </LinkButton>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          <Link href="/" className="text-blue">
            Volver al inicio
          </Link>
        </p>
      </MobileShell>
    </div>
  );
}
