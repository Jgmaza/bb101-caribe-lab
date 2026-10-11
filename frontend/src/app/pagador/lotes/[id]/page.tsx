import Link from "next/link";
import { notFound } from "next/navigation";
import { PagadorShell } from "@/components/PagadorShell";
import { Card, LinkButton, StatusChip } from "@/components/ui";
import { formatCop, getLote } from "@/lib/mock";

export default async function DashboardLotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lote = getLote(id);
  if (!lote) notFound();

  if (id === "carnaval-donaciones") {
    notFound();
  }

  const ok = lote.receptores.filter((r) => r.estado === "Ok").length;
  const pending = lote.receptores.filter((r) => r.estado === "Pendiente").length;
  const failed = lote.receptores.filter((r) => r.estado === "Fallido").length;

  return (
    <PagadorShell
      breadcrumb={`Lotes / ${lote.evento}`}
      right={
        <LinkButton href={`/pagador/lotes/${id}/cerrar`} variant="cta">
          Cerrar la noche
        </LinkButton>
      }
    >
      <h1 className="font-display text-[30px] font-bold text-ink">
        Dashboard del lote
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {lote.evento}
        {lote.cerradoEn ? ` · cerrado ${lote.cerradoEn}` : ""}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Ok", String(ok), "text-success"],
          ["Pendiente", String(pending), "text-warn"],
          ["Fallido", String(failed), "text-danger"],
          ["Total", formatCop(lote.total), "text-blue"],
        ].map(([label, value, color]) => (
          <Card key={label} className="p-5">
            <p className="text-[13px] text-ink-muted">{label}</p>
            <p className={`font-display text-[28px] font-bold ${color}`}>
              {value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1.3fr_0.8fr_1fr_0.9fr_0.8fr_1.1fr] gap-3 bg-bg-soft px-5 py-3.5 text-xs font-semibold text-ink-muted md:grid">
          <span>Persona</span>
          <span>Rol</span>
          <span>Celular</span>
          <span>Monto</span>
          <span>Estado</span>
          <span>Comprobante</span>
        </div>
        <ul>
          {lote.receptores.map((r) => (
            <li
              key={r.id}
              className="grid gap-1 border-t border-line px-5 py-3.5 md:grid-cols-[1.3fr_0.8fr_1fr_0.9fr_0.8fr_1.1fr] md:items-center md:gap-3"
            >
              <p className="text-sm font-semibold text-ink">{r.nombre}</p>
              <p className="text-[13px] text-ink-muted">{r.rol}</p>
              <p className="text-[13px] text-ink">{r.celular}</p>
              <p className="text-[13px] font-semibold text-ink">
                {formatCop(r.monto)}
              </p>
              <StatusChip status={r.estado} />
              {r.hash ? (
                <Link
                  href={`/cobrar/${r.id}/comprobante`}
                  className="text-[13px] font-semibold text-blue"
                >
                  Ver en explorador
                </Link>
              ) : (
                <span className="text-[13px] text-ink-muted">—</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-6 text-sm text-ink-muted">
        Demo receptor:{" "}
        <Link href="/cobrar/laura" className="font-semibold text-blue">
          abrir flujo de Laura
        </Link>
      </p>
    </PagadorShell>
  );
}
