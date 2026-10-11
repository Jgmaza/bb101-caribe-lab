import { PagadorShell } from "@/components/PagadorShell";
import { Card, Field, Input, LinkButton } from "@/components/ui";
import { formatCop, getLote } from "@/lib/mock";

export default function NuevoLotePage() {
  const preview = getLote("dann-lobby")!.receptores;

  return (
    <PagadorShell breadcrumb="Lotes / Nuevo lote">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-7">
          <h1 className="font-display text-[28px] font-bold text-ink">
            Nuevo lote
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Carga el staff del show o un lote porcentual de donaciones.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <Field label="Nombre del evento">
              <Input defaultValue="Show lobby — Hotel Dann Carlton" />
            </Field>
            <Field label="Fecha / hora">
              <Input defaultValue="11 oct 2026 · 22:30" />
            </Field>
            <Field label="Tipo de lote">
              <Input defaultValue="Staff / músicos" />
            </Field>

            <div>
              <p className="mb-2 text-xs font-semibold text-ink-muted">
                Receptores (CSV / lista)
              </p>
              <div className="flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-green bg-[#F0F8F6] px-4 text-center">
                <p className="text-sm font-semibold text-green">Subir CSV</p>
                <p className="text-[13px] text-ink-muted">
                  Arrastra CSV o pega filas: nombre, celular, monto, rol
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink">
              Vista previa · {preview.length} receptores
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {preview.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      {r.nombre}
                    </p>
                    <p className="text-xs text-ink-muted">{r.rol}</p>
                  </div>
                  <p className="text-[13px] font-semibold text-ink">
                    {formatCop(r.monto)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="rounded-[14px] bg-ink p-5 text-white">
            <p className="text-[13px] text-[#A8C0CC]">Total a dispersar</p>
            <p className="font-display text-3xl font-bold">
              {formatCop(2_040_000)}
            </p>
          </div>

          <LinkButton href="/pagador/lotes/dann-lobby/cerrar" variant="cta">
            Continuar a cerrar noche
          </LinkButton>
        </div>
      </div>
    </PagadorShell>
  );
}
