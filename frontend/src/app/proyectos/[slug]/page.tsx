import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { DesktopShell } from "@/components/DesktopShell";
import { Card, LinkButton, ShareBar, StatusChip, TxLink, shareColor } from "@/components/ui";
import { KIND_LABEL, formatBalance, formatCop, formatDateTime, shortKey } from "@/lib/format";
import { describeChange, diffMembers } from "@/lib/members";
import { stroopsToCop } from "@/lib/money";
import { canRetryDistribution, paymentPhase } from "@/lib/payments";
import { reconcilePayments } from "@/lib/server/payment-flow";
import {
  getBalance,
  getProjectAccess,
  getProjectMembers,
  getProjectPayments,
  getShareChanges,
} from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { explorerAccountUrl } from "@/lib/server/stellar";
import { bpsToPercent } from "@/lib/split";
import { RetryDistribution } from "./RetryDistribution";

export default async function ProyectoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ repartido?: string | string[] }>;
}) {
  const { slug } = await params;
  const { repartido } = await searchParams;
  const user = await requireUser(`/proyectos/${encodeURIComponent(slug)}`);
  const access = await getProjectAccess(slug, user.id);
  // Solo integrantes: a los demás no les decimos que el proyecto existe.
  if (!access?.membership) notFound();
  const { project, membership } = access;
  const isAdmin = membership.is_admin;

  const [members, firstPayments, changes, balance] = await Promise.all([
    getProjectMembers(project.id),
    getProjectPayments(project.id),
    getShareChanges(project.id),
    getBalance(project.stellar_public_key),
  ]);
  // Pagos que quedaron en vuelo (la red no confirmó a tiempo): se averigua ahora si salieron.
  const payments = (await reconcilePayments(firstPayments))
    ? await getProjectPayments(project.id)
    : firstPayments;
  const now = new Date();
  // Aviso tras un reintento exitoso (la acción redirige aquí con ?repartido=<id>).
  const justDistributed = payments.find((p) => p.id === repartido && p.status === "distributed");
  const distributed = payments
    .filter((p) => p.status === "distributed")
    .reduce((acc, p) => acc + p.amount_cop, 0);

  return (
    <DesktopShell
      breadcrumb={`Proyectos / ${project.name}`}
      right={
        <div className="flex items-center gap-3">
          <Link href="/inicio" className="text-sm font-semibold text-ink-muted hover:text-blue">
            Mi inicio
          </Link>
          {isAdmin ? (
            <LinkButton href={`/proyectos/${slug}/editar`} variant="ghost" className="py-2.5 text-sm">
              Editar proyecto
            </LinkButton>
          ) : null}
        </div>
      }
    >
      <p className="text-xs font-semibold tracking-wide text-blue uppercase">
        {KIND_LABEL[project.kind]}
      </p>
      <h1 className="mt-1 font-display text-[32px] font-bold text-ink">{project.name}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tu parte: <strong className="text-ink">{bpsToPercent(membership.share_bps)}%</strong>
        {isAdmin ? " · Eres admin" : ""}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Link de pago</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Compártanlo con el bar, hotel o productora. Pagan un total y Orilla lo
            reparte según sus porcentajes.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-bg-soft px-3 py-2 text-[13px] text-ink">
              /pagar/{slug}
            </code>
            <CopyLink path={`/pagar/${slug}`} />
            <Link href={`/pagar/${slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue">
              Abrir →
            </Link>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-[13px] text-ink-muted">Repartido</p>
            <p className="font-display text-2xl font-bold text-success">{formatCop(distributed)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] text-ink-muted">En cuenta del proyecto</p>
            <p className="font-display text-2xl font-bold text-ink">
              {balance.cop === null ? formatBalance(null) : `≈ ${formatBalance(balance.cop)}`}
            </p>
            <a
              href={explorerAccountUrl(project.stellar_public_key)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-blue hover:underline"
            >
              {shortKey(project.stellar_public_key)}
            </a>
          </Card>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="p-5">
          <h2 className="text-sm font-bold text-ink">Integrantes · {members.length}</h2>
          <div className="mt-3">
            <ShareBar shares={members.map((m) => ({ label: m.user.display_name, bps: m.share_bps }))} />
          </div>
        </div>
        <div className="hidden grid-cols-[1.6fr_1fr_0.5fr_0.5fr] gap-3 bg-bg-soft px-5 py-3 text-xs font-semibold text-ink-muted md:grid">
          <span>Persona</span>
          <span>Rol</span>
          <span>%</span>
          <span />
        </div>
        <ul>
          {members.map((m, i) => (
            <li
              key={m.id}
              className="grid gap-1 border-t border-line px-5 py-3.5 md:grid-cols-[1.6fr_1fr_0.5fr_0.5fr] md:items-center md:gap-3"
            >
              <p className="flex min-w-0 items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: shareColor(i) }} />
                <span className="truncate font-semibold text-ink">{m.user.display_name}</span>
                <span className="truncate text-ink-muted">@{m.user.username}</span>
                {m.user_id === user.id ? <span className="text-xs text-ink-muted">(tú)</span> : null}
              </p>
              <p className="text-[13px] text-ink-muted">{m.role || "—"}</p>
              <p className="text-sm font-bold text-blue">{bpsToPercent(m.share_bps)}%</p>
              <p>
                {m.is_admin ? (
                  <span className="inline-flex rounded-full bg-[#E8F4FA] px-2.5 py-0.5 text-xs font-semibold text-blue">
                    Admin
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mt-8 font-display text-2xl font-bold text-ink">Pagos y reparto</h2>
      {justDistributed ? (
        <p role="status" className="mt-3 rounded-[10px] bg-[#E6F6EF] px-3.5 py-3 text-sm text-success">
          Listo: el pago de {formatCop(justDistributed.amount_cop)} de {justDistributed.payer.display_name}{" "}
          quedó repartido.
        </p>
      ) : null}
      {payments.length === 0 ? (
        <Card className="mt-4 p-6 text-sm text-ink-muted">
          Todavía no hay pagos. Cuando alguien pague con el link, aparecerán aquí con
          lo que recibió cada integrante.
        </Card>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {payments.map((p) => (
            <li key={p.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{formatCop(p.amount_cop)}</p>
                    <p className="text-[13px] text-ink-muted">
                      {p.payer.display_name} · {formatDateTime(p.created_at)}
                    </p>
                    <Link
                      href={`/pagar/${slug}/recibo/${p.id}`}
                      className="mt-1 inline-block text-sm font-semibold text-blue hover:underline"
                    >
                      Ver recibo
                    </Link>
                  </div>
                  <StatusChip phase={paymentPhase(p)} />
                </div>

                {p.status === "distributed" ? (
                  <ul className="mt-4 grid gap-1.5 text-[13px] sm:grid-cols-2">
                    {[...p.distributions]
                      .sort((a, b) => b.amount_stroops - a.amount_stroops)
                      .map((d) => (
                        <li key={d.id} className="flex justify-between gap-3 border-b border-line pb-1.5">
                          <span className="text-ink-muted">
                            {d.user.display_name} · {bpsToPercent(d.share_bps)}%
                          </span>
                          <span className="font-semibold text-ink">
                            {formatCop(stroopsToCop(BigInt(d.amount_stroops), p.cop_per_xlm))}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
                  {p.payment_tx_hash && p.status !== "pending" ? (
                    <span>
                      Pago: <TxLink hash={p.payment_tx_hash} />
                    </span>
                  ) : null}
                  {p.distribution_tx_hash && p.status === "distributed" ? (
                    <span>
                      Reparto: <TxLink hash={p.distribution_tx_hash} />
                    </span>
                  ) : null}
                </div>

                {p.error && p.status !== "distributed" ? (
                  <p className="mt-3 text-xs text-danger">{p.error}</p>
                ) : null}
                {canRetryDistribution(p, now) ? (
                  isAdmin ? (
                    <RetryDistribution slug={slug} paymentId={p.id} />
                  ) : (
                    <p className="mt-2 text-xs text-ink-muted">
                      Un admin del proyecto puede reintentar el reparto. No hay que volver a pagar.
                    </p>
                  )
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-display text-2xl font-bold text-ink">Historial de cambios</h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Quién cambió los porcentajes, los roles o los integrantes. Los pagos ya
        repartidos conservan el porcentaje que tenían en su momento.
      </p>
      <Card className="mt-4">
        <ul className="divide-y divide-line">
          {changes.map((c) => {
            const created = c.before.length === 0;
            const lines = diffMembers(c.before, c.after).map(describeChange);
            return (
              <li key={c.id} className="px-5 py-4">
                <p className="text-sm text-ink">
                  <strong>{c.author.display_name}</strong>{" "}
                  <span className="text-ink-muted">@{c.author.username}</span>{" "}
                  {created ? "creó el proyecto" : "editó el proyecto"}
                </p>
                <p className="text-xs text-ink-muted">{formatDateTime(c.created_at)}</p>
                <ul className="mt-2 flex flex-col gap-0.5 text-[13px] text-ink-muted">
                  {lines.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </Card>
    </DesktopShell>
  );
}
