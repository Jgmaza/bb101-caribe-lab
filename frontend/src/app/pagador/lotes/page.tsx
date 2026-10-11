import Link from "next/link";
import { PagadorShell } from "@/components/PagadorShell";
import { Card, LinkButton, StatusChip } from "@/components/ui";
import { formatCop, lotes } from "@/lib/mock";

export default function LotesPage() {
  return (
    <PagadorShell
      breadcrumb="Hotel Dann Carlton · Barranquilla"
      right={
        <LinkButton href="/pagador/lotes/nuevo">Nuevo lote</LinkButton>
      }
    >
      <h1 className="font-display text-[32px] font-bold text-ink">
        Lotes de pago
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        Cierra la noche del show o programa la dispersión de donaciones
        Carnaval SA.
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_1fr_0.7fr_1fr_0.9fr_0.6fr] gap-3 bg-bg-soft px-5 py-3.5 text-xs font-semibold text-ink-muted md:grid">
          <span>Evento</span>
          <span>Tipo</span>
          <span>Personas</span>
          <span>Total COP</span>
          <span>Estado</span>
          <span />
        </div>
        <ul>
          {lotes.map((lote) => (
            <li
              key={lote.id}
              className="grid gap-2 border-t border-line px-5 py-4 md:grid-cols-[1.6fr_1fr_0.7fr_1fr_0.9fr_0.6fr] md:items-center md:gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{lote.evento}</p>
                <p className="text-xs text-ink-muted md:hidden">{lote.tipo}</p>
              </div>
              <p className="hidden text-[13px] text-ink-muted md:block">
                {lote.tipo}
              </p>
              <p className="text-sm text-ink">{lote.personas}</p>
              <p className="text-sm font-semibold text-ink">
                {formatCop(lote.total)}
              </p>
              <StatusChip status={lote.estado} />
              <Link
                href={
                  lote.id === "carnaval-donaciones"
                    ? "/pagador/lotes/carnaval"
                    : lote.estado === "Borrador"
                      ? "/pagador/lotes/nuevo"
                      : `/pagador/lotes/${lote.id}`
                }
                className="text-sm font-semibold text-blue"
              >
                {lote.estado === "Borrador" ? "Editar" : "Ver"}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </PagadorShell>
  );
}
