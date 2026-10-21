import { DesktopShell } from "@/components/DesktopShell";
import { requireUser } from "@/lib/server/session";
import { UploadForm } from "./UploadForm";

export default async function NuevoLotePage() {
  await requireUser("/lotes/nuevo");

  return (
    <DesktopShell breadcrumb="Lotes / Nuevo">
      <h1 className="font-display text-[32px] font-bold text-ink">Nuevo lote desde Excel</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Sube un Excel (.xlsx o .xls) o CSV y revisa quién recibe cuánto. Comprobamos los
        montos y las cuentas Orilla antes de guardar el borrador.
      </p>

      <div className="mt-8">
        <UploadForm />
      </div>
    </DesktopShell>
  );
}
