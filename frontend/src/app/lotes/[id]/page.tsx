import Link from "next/link";
import { notFound } from "next/navigation";
import { DesktopShell } from "@/components/DesktopShell";
import { Card, TxLink } from "@/components/ui";
import { formatCop, formatDateTime } from "@/lib/format";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { bpsToPercent } from "@/lib/split";
import { LoteActions } from "./LoteActions";

const STATUS: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  closing: "Cerrando…",
  closed: "Cerrado",
  failed: "Falló",
};

export default async function LoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cerrado?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/lotes/${id}`);

  const { data: lote } = await db().from("lotes").select("*").eq("id", id).maybeSingle();
  if (!lote || lote.owner_id !== user.id) notFound();

  const { data: items } = await db()
    .from("lote_items")
    .select("*")
    .eq("lote_id", id)
    .order("created_at", { ascending: true });

  const canAct = lote.status === "draft" || lote.status === "scheduled" || lote.status === "failed";
  const unmatched = (items ?? []).filter((i) => !i.user_id);

  return (
    <DesktopShell breadcrumb={`Lotes / ${lote.name}`}>
      <p className="text-xs font-semibold tracking-wide text-blue uppercase">
        {STATUS[lote.status]} · {lote.mode === "percent" ? "Porcentajes" : "Montos"}
      </p>
      <h1 className="mt-1 font-display text-[32px] font-bold text-ink">{lote.name}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Creado {formatDateTime(lote.created_at)}
        {lote.total_cop ? ` · total ${formatCop(Number(lote.total_cop))}` : ""}
        {lote.notes ? ` · ${lote.notes}` : ""}
      </p>

      {sp.cerrado ? (
        <p role="status" className="mt-4 rounded-[10px] bg-[#E6F6EF] px-3.5 py-3 text-sm text-success">
          Noche cerrada. Cada persona ve <strong>Te pagaron</strong> en su wallet.
          {lote.distribution_tx_hash ? (
            <>
              {" "}
              Comprobante: <TxLink hash={lote.distribution_tx_hash} />
            </>
          ) : null}
        </p>
      ) : null}

      {lote.error ? (
        <p role="alert" className="mt-4 rounded-[10px] bg-[#FCEAEA] px-3.5 py-3 text-sm text-danger">
          {lote.error}
        </p>
      ) : null}

      {unmatched.length > 0 ? (
        <p className="mt-4 rounded-[10px] bg-[#F4F1E6] px-3.5 py-3 text-sm text-warn">
          {unmatched.length} persona(s) sin cuenta Orilla coincidente. Deben registrarse con el
          mismo @usuario antes de cerrar.
        </p>
      ) : null}

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-bg-soft text-xs font-semibold text-ink-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Celular</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((i) => (
              <tr key={i.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{i.display_name || "—"}</td>
                <td className="px-4 py-3">
                  {i.username ? (
                    <span className={i.user_id ? "text-ink" : "text-warn"}>@{i.username}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{i.phone || "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{i.role || "—"}</td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {lote.mode === "percent" && i.share_bps
                    ? `${bpsToPercent(i.share_bps)}%`
                    : i.amount_cop
                      ? formatCop(Number(i.amount_cop))
                      : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <LoteActions loteId={lote.id} canSchedule={canAct && lote.status !== "scheduled"} canClose={canAct} />
        <Link href="/lotes" className="text-sm font-semibold text-blue hover:underline">
          ← Todos los lotes
        </Link>
      </div>
    </DesktopShell>
  );
}
