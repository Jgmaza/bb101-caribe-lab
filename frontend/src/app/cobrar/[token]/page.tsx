import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { getClaimView, syncClaimFromSdp } from "@/lib/cobrar/claim";
import { ClaimClient } from "./ClaimClient";

export default async function CobrarClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Sync al entrar: si Laura ya cobró en Demo Wallet, traemos el hash
  let claim = await syncClaimFromSdp(token).catch(() => getClaimView(token));
  if (!claim) {
    claim = await getClaimView(token);
  }
  if (!claim) notFound();

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell>
        <Logo href="/" />
        <h1 className="mt-5 font-display text-[30px] font-bold text-ink">
          Cobra tu pago
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {claim.evento}. Confirma en Demo Wallet (SEP-24) y Orilla muestra el
          comprobante real en testnet.
        </p>
        <ClaimClient token={token} initial={claim} />
      </MobileShell>
    </div>
  );
}
