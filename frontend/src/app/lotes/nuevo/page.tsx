import Link from "next/link";
import { DesktopShell } from "@/components/DesktopShell";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/server/session";
import { UploadForm } from "./UploadForm";

export default async function NuevoLotePage() {
  await requireUser("/lotes/nuevo");

  return (
    <DesktopShell breadcrumb="Lotes / Nuevo">
      <h1 className="font-display text-[32px] font-bold text-ink">Nuevo lote desde Excel</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Orilla reconoce columnas como nombre, usuario, celular, rol y monto o porcentaje — para
        que el archivo con el que ya pagas sirva aquí.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <UploadForm />
        </Card>
        <Card className="p-6 text-sm text-ink-muted">
          <p className="font-semibold text-ink">Plantilla mínima</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-soft p-3 text-xs text-ink">
            {`nombre,usuario,celular,rol,monto
Laura Martínez,athomserx,3001112233,músico,450000
José Maza,jgmaza,3007654321,staff,550000`}
          </pre>
          <p className="mt-4">
            Cada <code className="text-ink">usuario</code> debe existir en Orilla.{" "}
            <Link href="/registro" className="font-semibold text-blue hover:underline">
              Crear cuentas
            </Link>{" "}
            antes de cerrar la noche.
          </p>
          <p className="mt-3 text-xs">
            Máx. 40 filas por lote en este MVP (Horizon). Noches grandes → SDP en una fase
            siguiente.
          </p>
        </Card>
      </div>
    </DesktopShell>
  );
}
