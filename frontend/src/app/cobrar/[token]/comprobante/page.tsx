import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { getClaimView, syncClaimFromSdp } from "@/lib/cobrar/claim";
import { formatCop } from "@/lib/format";

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let claim = await syncClaimFromSdp(token).catch(() => getClaimView(token));
  if (!claim) claim = await getClaimView(token);
  if (!claim) notFound();
  if (!claim.paid || !claim.hash) redirect(`/cobrar/${token}`);

  const shortHash = `${claim.hash.slice(0, 8)}…${claim.hash.slice(-6)}`;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell
        left={
          <Link href={`/cobrar/${token}/pago`} className="text-lg font-semibold">
            ←
          </Link>
        }
        showLogo
      >
        <h1 className="font-display text-[28px] font-bold text-ink">
          Comprobante
        </h1>

        <div className="mt-4 rounded-2xl border border-line bg-bg-soft p-5">
          <p className="font-display text-[30px] font-bold text-ink">
            {formatCop(claim.montoCop)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{claim.evento}</p>

          <dl className="mt-4 space-y-2.5 text-xs">
            {[
              ["Receptor", claim.nombre],
              ["Celular", claim.celular],
              ["Asset", `${claim.montoStellar} ${claim.assetCode}`],
              ["Red", "Stellar testnet"],
              ["Tx hash", shortHash],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="max-w-[60%] break-all text-right font-semibold text-ink">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <a
          href={claim.explorerUrl!}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block"
        >
          <span className="inline-flex w-full items-center justify-center rounded-[10px] border border-line bg-white px-5 py-3.5 text-[15px] font-semibold text-ink">
            Abrir en stellar.expert
          </span>
        </a>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Hash real de la dispersión SDP → wallet. Ya no es mock.
        </p>

        <LinkButton
          href={`/cobrar/${token}/pago`}
          variant="ghost"
          className="mt-5 w-full"
        >
          Volver
        </LinkButton>
      </MobileShell>
    </div>
  );
}
