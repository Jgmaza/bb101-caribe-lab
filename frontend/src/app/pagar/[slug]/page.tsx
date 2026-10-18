import { notFound } from "next/navigation";
import { DesktopShell } from "@/components/DesktopShell";
import { Card, LinkButton } from "@/components/ui";
import { formatBalance } from "@/lib/format";
import { getBalance, getProjectBySlug, getProjectMembers } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { PayForm } from "./PayForm";

export default async function PagarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/pagar/${encodeURIComponent(slug)}`);
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [members, balance] = await Promise.all([
    getProjectMembers(project.id),
    getBalance(user.stellar_public_key),
  ]);

  return (
    <DesktopShell breadcrumb="Pagar a un proyecto">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="p-5 sm:p-7">
          <p className="text-xs font-semibold tracking-wide text-blue uppercase">Pagar a</p>
          <h1 className="mt-1 font-display text-[30px] font-bold text-ink">{project.name}</h1>
          <p className="mt-2 mb-6 text-sm text-ink-muted">
            Haces un solo pago. Orilla lo reparte entre los {members.length} integrantes
            según los porcentajes que ellos acordaron, al instante.
          </p>
          <PayForm
            slug={slug}
            balanceCop={balance.cop}
            members={members.map((m) => ({
              id: m.id,
              name: m.name,
              role: m.role,
              shareBps: m.share_bps,
            }))}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-[13px] font-bold text-ink">Pagas como {user.display_name}</p>
            <p className="mt-1 text-[13px] text-ink-muted">Saldo disponible hoy</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {balance.cop === null ? formatBalance(null) : `≈ ${formatBalance(balance.cop)}`}
            </p>
            <LinkButton href="/inicio" variant="ghost" className="mt-3 w-full py-2.5 text-sm">
              Recargar saldo
            </LinkButton>
          </Card>
          <Card className="p-5 text-[13px] leading-relaxed text-ink-muted">
            Cada pago queda registrado en la red Stellar: tú, el grupo y cada
            integrante pueden ver el mismo comprobante. Se acabó el “ya te pagué”
            contra “no me ha llegado”.
          </Card>
        </div>
      </div>
    </DesktopShell>
  );
}
