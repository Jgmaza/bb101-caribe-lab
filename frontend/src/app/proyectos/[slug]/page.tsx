import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { DesktopShell } from "@/components/DesktopShell";
import {
  Button,
  Card,
  LinkButton,
  ShareBar,
  StatusChip,
  TxLink,
  shareColor,
} from "@/components/ui";
import { formatBalance, formatCop, formatDateTime, formatPhone, shortKey } from "@/lib/format";
import { retryDistribution } from "@/lib/server/actions";
import { getProjectBySlug, getProjectMembers, getProjectPayments } from "@/lib/server/queries";
import { explorerAccountUrl, getCopBalance } from "@/lib/server/stellar";
import { bpsToPercent } from "@/lib/split";

const KIND_LABEL = { banda: "Banda / grupo musical", staff: "Staff de evento", otro: "Proyecto" };

export default async function ProyectoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [members, payments, balance] = await Promise.all([
    getProjectMembers(project.id),
    getProjectPayments(project.id),
    getCopBalance(project.stellar_public_key),
  ]);
  const received = payments
    .filter((p) => p.status === "distributed")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <DesktopShell
      breadcrumb={`Proyectos / ${project.name}`}
      right={
        <LinkButton href={`/proyectos/${slug}/editar`} variant="ghost" className="py-2.5 text-sm">
          Editar porcentajes
        </LinkButton>
      }
    >
      <p className="text-xs font-semibold tracking-wide text-blue uppercase">
        {KIND_LABEL[project.kind]}
      </p>
      <h1 className="mt-1 font-display text-[32px] font-bold text-ink">{project.name}</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Link de pago para el organizador</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Compártanlo con el bar, hotel o productora. Pagan un total y Orilla lo
            reparte según sus porcentajes.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-bg-soft px-3 py-2 text-[13px] text-ink">
              /pagar/{slug}
            </code>
            <CopyLink path={`/pagar/${slug}`} />
            <Link href={`/pagar/${slug}`} className="text-sm font-semibold text-blue">
              Abrir →
            </Link>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <p className="text-[13px] text-ink-muted">Repartido</p>
            <p className="font-display text-2xl font-bold text-success">{formatCop(received)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] text-ink-muted">En cuenta del proyecto</p>
            <p className="font-display text-2xl font-bold text-ink">{formatBalance(balance)}</p>
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
            <ShareBar shares={members.map((m) => ({ label: m.name, bps: m.share_bps }))} />
          </div>
        </div>
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.5fr_1fr] gap-3 bg-bg-soft px-5 py-3 text-xs font-semibold text-ink-muted md:grid">
          <span>Persona</span>
          <span>Rol</span>
          <span>Celular</span>
          <span>%</span>
          <span>Link de cobro</span>
        </div>
        <ul>
          {members.map((m, i) => (
            <li
              key={m.id}
              className="grid gap-1 border-t border-line px-5 py-3.5 md:grid-cols-[1.4fr_1fr_1fr_0.5fr_1fr] md:items-center md:gap-3"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: shareColor(i) }} />
                {m.name}
              </p>
              <p className="text-[13px] text-ink-muted">{m.role || "—"}</p>
              <p className="text-[13px] text-ink">{formatPhone(m.phone)}</p>
              <p className="text-sm font-bold text-blue">{bpsToPercent(m.share_bps)}%</p>
              <div className="flex items-center gap-3">
                <Link href={`/cobrar/${m.id}`} className="text-[13px] font-semibold text-blue">
                  Abrir
                </Link>
                <CopyLink path={`/cobrar/${m.id}`} label="Copiar" />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mt-8 font-display text-2xl font-bold text-ink">Pagos recibidos</h2>
      {payments.length === 0 ? (
        <Card className="mt-4 p-6 text-sm text-ink-muted">
          Todavía no hay pagos. Cuando el organizador pague con el link, aparecerán
          aquí con el reparto de cada integrante.
        </Card>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {payments.map((p) => (
            <li key={p.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">{formatCop(p.amount)}</p>
                    <p className="text-[13px] text-ink-muted">
                      {p.payer_name} · {formatDateTime(p.created_at)}
                    </p>
                  </div>
                  <StatusChip status={p.status} />
                </div>

                {p.distributions.length > 0 ? (
                  <ul className="mt-4 grid gap-1.5 text-[13px] sm:grid-cols-2">
                    {[...p.distributions]
                      .sort((a, b) => b.amount - a.amount)
                      .map((d) => (
                        <li key={d.id} className="flex justify-between gap-3 border-b border-line pb-1.5">
                          <span className="text-ink-muted">
                            {d.member.name} · {bpsToPercent(d.share_bps)}%
                          </span>
                          <span className="font-semibold text-ink">{formatCop(d.amount)}</span>
                        </li>
                      ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
                  {p.payment_tx_hash ? (
                    <span>
                      Pago: <TxLink hash={p.payment_tx_hash} />
                    </span>
                  ) : null}
                  {p.distribution_tx_hash ? (
                    <span>
                      Reparto: <TxLink hash={p.distribution_tx_hash} />
                    </span>
                  ) : null}
                </div>

                {p.error ? <p className="mt-3 text-xs text-danger">{p.error}</p> : null}
                {p.status === "failed" && p.payment_tx_hash ? (
                  <form action={retryDistribution.bind(null, p.id)} className="mt-3">
                    <Button type="submit" variant="ghost" className="py-2 text-sm">
                      Reintentar reparto
                    </Button>
                  </form>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </DesktopShell>
  );
}
