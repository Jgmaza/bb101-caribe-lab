import Link from "next/link";
import { DesktopShell } from "@/components/DesktopShell";
import { Card, LinkButton } from "@/components/ui";
import { formatCop, formatDateTime } from "@/lib/format";
import { db } from "@/lib/server/db";
import { logout } from "@/lib/server/auth-actions";
import { requireUser } from "@/lib/server/session";

const STATUS: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  closing: "Cerrando…",
  closed: "Cerrado",
  failed: "Falló",
};

export default async function LotesPage() {
  const user = await requireUser("/lotes");
  const { data: lotes } = await db()
    .from("lotes")
    .select("id, name, mode, status, total_cop, created_at, closed_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DesktopShell
      breadcrumb="Lotes"
      right={
        <form action={logout}>
          <button type="submit" className="cursor-pointer text-sm font-semibold text-ink-muted hover:text-blue">
            Salir
          </button>
        </form>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-blue uppercase">Empresa</p>
          <h1 className="font-display text-[32px] font-bold text-ink">Tus lotes de pago</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Sube el Excel con el que ya trabajas, revisa montos o %, programa y cierra la noche.
          </p>
        </div>
        <LinkButton href="/lotes/nuevo" variant="cta">
          Nuevo lote desde Excel
        </LinkButton>
      </div>

      {!lotes?.length ? (
        <Card className="mt-8 p-8 text-sm text-ink-muted">
          Aún no hay lotes.{" "}
          <Link href="/lotes/nuevo" className="font-semibold text-blue hover:underline">
            Sube tu primer CSV
          </Link>{" "}
          (en Excel: Archivo → Guardar como → CSV).
        </Card>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {lotes.map((l) => (
            <li key={l.id}>
              <Link
                href={`/lotes/${l.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-white p-5 transition hover:border-blue"
              >
                <div>
                  <p className="font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-ink-muted">
                    {STATUS[l.status] ?? l.status}
                    {" · "}
                    {l.mode === "percent" ? "Porcentajes" : "Montos exactos"}
                    {l.total_cop ? ` · total ${formatCop(Number(l.total_cop))}` : ""}
                    {" · "}
                    {formatDateTime(l.created_at)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue">Abrir →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DesktopShell>
  );
}
