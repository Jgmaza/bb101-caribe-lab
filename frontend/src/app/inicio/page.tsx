import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import Link from "next/link";
import { Card, LinkButton, TxLink } from "@/components/ui";
import { formatBalance, formatCop, formatDateTime } from "@/lib/format";
import { logout } from "@/lib/server/auth-actions";
import { db } from "@/lib/server/db";
import { isProdMode } from "@/lib/server/env";
import { explorerAccountUrl } from "@/lib/server/stellar";
import { getBalance, getUserMovements } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { TopUpForm } from "./TopUpForm";

export default async function InicioPage() {
  const user = await requireUser("/inicio");
  const [balance, movements, paidItems] = await Promise.all([
    getBalance(user.stellar_public_key),
    getUserMovements(user.id),
    db()
      .from("lote_items")
      .select("id, amount_cop, role, created_at, lote:lotes(id, name, distribution_tx_hash, closed_at, status)")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  type LoteRef = { id: string; name: string; distribution_tx_hash: string | null; closed_at: string | null; status: string };
  const loteOf = (raw: unknown): LoteRef | null => {
    if (!raw) return null;
    if (Array.isArray(raw)) return (raw[0] as LoteRef) ?? null;
    return raw as LoteRef;
  };
  const notifications = (paidItems.data ?? [])
    .map((i) => ({ ...i, loteRef: loteOf(i.lote) }))
    .filter((i) => i.loteRef?.status === "closed");

  return (
    <MobileShell
      left={<Logo href="/inicio" size="md" />}
      right={
        <form action={logout}>
          <button type="submit" className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-blue">
            Salir
          </button>
        </form>
      }
    >
      <p className="text-sm text-ink-muted">Hola,</p>
      <h1 className="font-display text-[28px] font-bold leading-tight text-ink">{user.display_name}</h1>
      <p className="text-sm text-ink-muted">@{user.username}</p>

      {notifications[0] ? (
        <Card className="mt-6 border-success/30 bg-[#E6F6EF] p-5">
          <p className="text-xs font-semibold tracking-wide text-success uppercase">Notificación</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            Te pagaron {formatCop(Number(notifications[0].amount_cop))}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {notifications[0].loteRef!.name}
            {notifications[0].role ? ` · ${notifications[0].role}` : ""}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <LinkButton href={`/inicio/pago/${notifications[0].id}`} variant="cta" className="w-full">
              Ver comprobante
            </LinkButton>
            <LinkButton href="/retirar" variant="ghost" className="w-full">
              Pasar a mi banco
            </LinkButton>
          </div>
        </Card>
      ) : null}

      <Card className="mt-6 p-5">
        <p className="text-xs font-semibold text-ink-muted">Tu saldo en Orilla</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">
          {balance.cop === null ? formatBalance(null) : `≈ ${formatBalance(balance.cop)}`}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {balance.cop === null ? "Intenta de nuevo en un momento." : "En pesos, al precio de hoy."}
        </p>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        <LinkButton href="/retirar" variant="primary" className="w-full">
          Pasar a mi banco
        </LinkButton>
        <TopUpForm />
        <LinkButton href="/lotes" variant="ghost" className="w-full">
          Panel empresa / lotes
        </LinkButton>
        {isProdMode() ? null : (
          <a
            href={explorerAccountUrl(user.stellar_public_key)}
            target="_blank"
            rel="noreferrer"
            className="rounded-[10px] border border-dashed border-line px-4 py-3 text-center text-sm font-semibold text-blue hover:border-blue hover:bg-bg-soft"
          >
            Ver en Stellar Expert ↗
          </a>
        )}
      </div>

      {notifications.length > 1 ? (
        <>
          <h2 className="mt-8 text-sm font-bold text-ink">Pagos recientes</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/inicio/pago/${n.id}`}
                  className="flex items-center justify-between rounded-[14px] border border-line bg-white p-4 hover:border-blue"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Te pagaron {formatCop(Number(n.amount_cop))}
                    </p>
                    <p className="text-xs text-ink-muted">{n.loteRef!.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue">Ver</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="mt-8 text-sm font-bold text-ink">Movimientos</h2>
      {movements.length === 0 && notifications.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          Cuando una empresa cierre la noche con tu @usuario, verás Te pagaron aquí.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {movements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {m.href ? (
                    <Link href={m.href} className="hover:text-blue">
                      {m.title}
                    </Link>
                  ) : (
                    m.title
                  )}
                </p>
                <p className="text-xs text-ink-muted">
                  {formatDateTime(m.at)}
                  {m.note ? <span className="font-semibold text-warn"> · {m.note}</span> : null}
                  {m.txHash ? (
                    <>
                      {" · "}
                      <TxLink hash={m.txHash} label="comprobante" />
                    </>
                  ) : null}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${m.amountCop >= 0 ? "text-success" : "text-ink"}`}>
                {m.amountCop >= 0 ? "+" : "−"}
                {formatCop(Math.abs(m.amountCop))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </MobileShell>
  );
}
