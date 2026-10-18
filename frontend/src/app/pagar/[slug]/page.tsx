import { notFound } from "next/navigation";
import { DesktopShell } from "@/components/DesktopShell";
import { Button, Card } from "@/components/ui";
import { formatBalance, formatCop, shortKey } from "@/lib/format";
import { fundOrganizer } from "@/lib/server/actions";
import { getProjectBySlug, getProjectMembers } from "@/lib/server/queries";
import { explorerAccountUrl, getCopBalance, organizerPublicKey } from "@/lib/server/stellar";
import { PayForm } from "./PayForm";

export default async function PagarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const organizer = organizerPublicKey();
  const [members, organizerBalance] = await Promise.all([
    getProjectMembers(project.id),
    getCopBalance(organizer),
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
            organizerBalance={organizerBalance}
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
            <p className="text-[13px] font-bold text-ink">Organizador demo (testnet)</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              En el MVP pagas desde una cuenta de prueba con COP de testnet. La
              entrada de pesos reales llega en v2.
            </p>
            <p className="mt-3 font-display text-2xl font-bold text-ink">
              {formatBalance(organizerBalance)}
            </p>
            <a
              href={explorerAccountUrl(organizer)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-blue hover:underline"
            >
              {shortKey(organizer)}
            </a>
            <form action={fundOrganizer} className="mt-3">
              <Button type="submit" variant="ghost" className="w-full py-2.5 text-sm">
                Fondear organizador demo (+{formatCop(5_000_000)})
              </Button>
            </form>
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
