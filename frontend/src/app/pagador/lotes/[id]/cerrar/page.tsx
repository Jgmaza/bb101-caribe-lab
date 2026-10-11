import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";
import { formatCop, getLote } from "@/lib/mock";

export default async function CerrarNochePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lote = getLote(id);
  if (!lote || lote.receptores.length === 0) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-soft px-6 py-12">
      <div className="w-full max-w-[560px] rounded-[18px] border border-line bg-white p-9 shadow-sm">
        <Logo href="/pagador/lotes" />
        <h1 className="mt-5 font-display text-[32px] font-bold text-ink">
          ¿Cerrar la noche?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
          Vas a dispersar el lote de {lote.evento} a {lote.receptores.length}{" "}
          personas. Cada receptor recibirá un SMS con link para cobrar.
        </p>

        <dl className="mt-5 space-y-2.5 rounded-xl bg-bg-soft p-4">
          {[
            ["Evento", lote.evento],
            ["Receptores", String(lote.receptores.length)],
            ["Total", formatCop(lote.total)],
            ["Saldo mock", "Suficiente (testnet)"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-[13px]">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href={`/pagador/lotes/${id}`} variant="ghost">
            Volver
          </LinkButton>
          <LinkButton href={`/pagador/lotes/${id}`} variant="cta">
            Cerrar la noche
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
