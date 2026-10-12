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
            Crear lote de pago
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Prepara los pagos del staff y los músicos del evento. Revisa a
            quién le pagarás y cuánto recibirá cada persona antes de cerrar la
            noche.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <Field label="Nombre del evento">
              <Input defaultValue="Show lobby — Hotel Dann Carlton" />
            </Field>
            <Field label="Fecha y hora del evento">
              <Input defaultValue="11 oct 2026 · 22:30" />
            </Field>
            <Field label="Tipo de lote">
              <Input defaultValue="Staff / músicos" />
            </Field>

            <div>
              <p className="mb-2 text-xs font-semibold text-ink-muted">
                Lista de destinatarios
              </p>
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-green bg-[#F0F8F6] px-4 py-5 text-center">
                <p className="text-sm font-semibold text-green">Plantilla de pagos</p>
                <p className="text-[13px] text-ink-muted">
                  Una fila por persona: nombre, celular, monto en COP y rol.
                </p>
                <a
                  href="/plantillas/lote-de-pago.csv"
                  download="plantilla-lote-de-pago.csv"
                  className="inline-flex items-center justify-center rounded-[10px] border border-green bg-white px-4 py-3 text-sm font-semibold text-green transition hover:bg-bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
                >
                  Descargar plantilla CSV
                </a>
                <p className="text-xs text-ink-muted">
                  Ábrela en Excel o Google Sheets y reemplaza las filas de
                  ejemplo. Conserva los encabezados y escribe el monto sin
                  símbolo $ ni separadores de miles: 450000.
                </p>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Esta demo muestra una lista de ejemplo. La carga de archivos
                estará disponible en una próxima versión.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink">
              Revisa los pagos · {preview.length} destinatarios
            </h2>
            <p className="mt-2 text-xs text-ink-muted">
              Confirma el nombre y el monto de cada persona. Todos los valores
              están en pesos colombianos (COP).
            </p>
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
            <p className="text-[13px] text-[#A8C0CC]">Total del lote (COP)</p>
            <p className="font-display text-3xl font-bold">
              {formatCop(2_040_000)}
            </p>
          </div>

          <LinkButton href="/pagador/lotes/dann-lobby/cerrar" variant="cta">
            Revisar y cerrar la noche
          </LinkButton>
          <p className="text-center text-xs text-ink-muted">
            En el siguiente paso revisarás el resumen antes de confirmar.
          </p>
        </div>
      </div>
    </PagadorShell>
  );
}
