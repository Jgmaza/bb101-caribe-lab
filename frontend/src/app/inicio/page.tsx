import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import Link from "next/link";
import { Card, TxLink } from "@/components/ui";
import { KIND_LABEL, formatBalance, formatCop, formatDateTime } from "@/lib/format";
import { stroopsToCop } from "@/lib/money";
import { logout } from "@/lib/server/auth-actions";
import { getBalance, getUserProjects, getUserTopups } from "@/lib/server/queries";
import { bpsToPercent } from "@/lib/split";
import { requireUser } from "@/lib/server/session";
import { TopUpForm } from "./TopUpForm";

export default async function InicioPage() {
  const user = await requireUser("/inicio");
  const [balance, projects, topups] = await Promise.all([
    getBalance(user.stellar_public_key),
    getUserProjects(user.id),
    getUserTopups(user.id, 10),
  ]);

  return (
    <MobileShell
      left={<Logo href="/inicio" size="sm" />}
      right={
        <form action={logout}>
          <button type="submit" className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-blue">
            Salir
          </button>
        </form>
      }
    >
      <p className="mt-2 text-sm text-ink-muted">Hola,</p>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">{user.display_name}</h1>
      <p className="text-sm text-ink-muted">@{user.username}</p>

      <Card className="mt-6 p-5">
        <p className="text-xs font-semibold text-ink-muted">Saldo disponible</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">
          {balance.cop === null ? formatBalance(null) : `≈ ${formatBalance(balance.cop)}`}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {balance.cop === null ? "Intenta de nuevo en un momento." : "En pesos, al precio de hoy."}
        </p>
      </Card>

      <div className="mt-4">
        <TopUpForm />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink">Mis proyectos</h2>
        <Link href="/proyectos/nuevo" className="text-sm font-semibold text-blue hover:underline">
          + Crear proyecto
        </Link>
      </div>
      {projects.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          Todavía no estás en ningún proyecto. Crea uno o pídele a tu grupo que te
          agregue con tu usuario @{user.username}.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.project.id}>
              <Link
                href={`/proyectos/${p.project.slug}`}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-white p-4 transition hover:border-blue"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{p.project.name}</p>
                  <p className="text-xs text-ink-muted">
                    {KIND_LABEL[p.project.kind]}
                    {p.role ? ` · ${p.role}` : ""}
                    {p.is_admin ? " · Admin" : ""}
                  </p>
                </div>
                <p className="shrink-0 font-display text-lg font-bold text-blue">
                  {bpsToPercent(p.share_bps)}%
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {topups.length > 0 ? (
        <>
          <h2 className="mt-8 text-sm font-bold text-ink">Movimientos</h2>
          <ul className="mt-2 divide-y divide-line">
            {topups.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">Recarga de saldo</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateTime(t.created_at)} · <TxLink hash={t.tx_hash} label="ver comprobante" />
                  </p>
                </div>
                <p className="text-sm font-semibold text-success">
                  +{formatCop(stroopsToCop(BigInt(t.amount_stroops), t.cop_per_xlm))}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </MobileShell>
  );
}
