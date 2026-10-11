import { PagadorShell } from "@/components/PagadorShell";
import { Card, LinkButton } from "@/components/ui";
import { carnavalBeneficiarios, formatCop } from "@/lib/mock";

export default function CarnavalDonacionesPage() {
  return (
    <PagadorShell breadcrumb="Carnaval SA · Encargado de donaciones">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-7">
          <h1 className="font-display text-[28px] font-bold text-ink">
            Lote porcentual de donaciones
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Recaudación del evento programada antes de los días de Carnaval.
            Orilla reparte por % como un Excel vivo — sin liquidar a mano.
          </p>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-ink px-5 py-4 text-white">
            <div>
              <p className="text-xs text-[#A8C0CC]">
                Pool de donaciones (mock)
              </p>
              <p className="font-display text-[28px] font-bold">
                {formatCop(28_400_000)}
              </p>
            </div>
            <p className="text-[13px] font-semibold text-sand">
              Programado · 10 feb
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 hidden grid-cols-[1.5fr_1fr_0.5fr_1fr] gap-3 text-xs font-semibold text-ink-muted md:grid">
              <span>Beneficiario</span>
              <span>Rol</span>
              <span>%</span>
              <span>Monto</span>
            </div>
            <ul>
              {carnavalBeneficiarios.map((b) => (
                <li
                  key={b.nombre}
                  className="grid gap-1 border-t border-line py-3 md:grid-cols-[1.5fr_1fr_0.5fr_1fr] md:items-center md:gap-3"
                >
                  <p className="text-[13px] font-semibold text-ink">
                    {b.nombre}
                  </p>
                  <p className="text-[13px] text-ink-muted">{b.rol}</p>
                  <p className="text-[13px] font-bold text-blue">{b.pct}%</p>
                  <p className="text-[13px] font-semibold text-ink">
                    {formatCop(b.monto)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-[13px] font-bold text-blue">
              Idea de valor (fase 2)
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              MVP esta semana: UI mock del reparto %. La decisión técnica sigue
              siendo SDP (opción B). Un smart contract de escrow/reparto solo se
              evalúa después si hace falta congelar fondos o reglas on-chain; no
              es obligatorio para el happy path del staff.
            </p>
          </Card>
          <LinkButton href="/pagador/lotes" variant="cta">
            Programar dispersión
          </LinkButton>
          <LinkButton href="/pagador/lotes" variant="ghost">
            Exportar Excel
          </LinkButton>
        </div>
      </div>
    </PagadorShell>
  );
}
