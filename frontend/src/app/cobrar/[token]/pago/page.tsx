import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { getClaimView, syncClaimFromSdp } from "@/lib/cobrar/claim";
import { formatCop } from "@/lib/format";

export default async function TePagaronPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let claim = await syncClaimFromSdp(token).catch(() => getClaimView(token));
  if (!claim) claim = await getClaimView(token);
  if (!claim) notFound();
  if (!claim.paid) redirect(`/cobrar/${token}`);

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell showLogo>
        <div className="rounded-[18px] bg-orilla-gradient p-5 text-white">
          <p className="text-[13px] font-semibold text-white/85">{claim.org}</p>
          <h1 className="mt-1 font-display text-[34px] font-bold leading-none">
            Te pagaron
          </h1>
          <p className="mt-2 font-display text-[42px] font-bold leading-none">
            {formatCop(claim.montoCop)}
          </p>
          <p className="mt-3 text-[13px] text-white/90">
            {claim.evento}
            {claim.cerradoEn ? ` · ${claim.cerradoEn}` : ""}
          </p>
        </div>

        <div className="mt-4 rounded-[14px] bg-bg-soft p-4">
          <dl className="space-y-3 text-[13px]">
            {[
              ["Receptor", claim.nombre],
              ["Rol", claim.rol],
              ["En wallet", `${claim.montoStellar} ${claim.assetCode}`],
              ["Estado", "SUCCESS · testnet"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          El XLM ya está en tu Demo Wallet (Stellar testnet). Bancolombia / COP
          queda para una fase con ancla.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <LinkButton
            href={`/cobrar/${token}/comprobante`}
            className="w-full"
          >
            Ver comprobante
          </LinkButton>
          <LinkButton
            href={`/cobrar/${token}/banco`}
            variant="ghost"
            className="w-full"
          >
            Enviar a Bancolombia (mock)
          </LinkButton>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          <Link href="/" className="text-blue">
            Volver al inicio
          </Link>
        </p>
      </MobileShell>
    </div>
  );
}
