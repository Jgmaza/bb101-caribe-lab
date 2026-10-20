import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { LinkButton, TxLink } from "@/components/ui";
import { formatCop, formatDateTime } from "@/lib/format";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";

export default async function TePagaronPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const user = await requireUser(`/inicio/pago/${itemId}`);

  const { data: item } = await db()
    .from("lote_items")
    .select("*, lote:lotes(id, name, distribution_tx_hash, closed_at, status, owner_id)")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.user_id !== user.id || item.status !== "paid") notFound();
  const raw = item.lote;
  const lote = (Array.isArray(raw) ? raw[0] : raw) as {
    name: string;
    distribution_tx_hash: string | null;
    closed_at: string | null;
    status: string;
  } | null;
  if (!lote || lote.status !== "closed") notFound();

  return (
    <MobileShell left={<Logo href="/inicio" size="sm" />}>
      <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F6EF] text-2xl text-success">
        ✓
      </div>
      <h1 className="mt-4 font-display text-[32px] font-bold text-ink">Te pagaron</h1>
      <p className="mt-2 font-display text-3xl font-bold text-success">
        {formatCop(Number(item.amount_cop))}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {lote.name}
        {item.role ? ` · ${item.role}` : ""}
        {lote.closed_at ? ` · ${formatDateTime(lote.closed_at)}` : ""}
      </p>

      {lote.distribution_tx_hash ? (
        <div className="mt-6 rounded-[14px] border border-line bg-white p-4 text-sm">
          <p className="font-semibold text-ink">Transacción en Stellar</p>
          <p className="mt-2">
            <TxLink hash={lote.distribution_tx_hash} />
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <LinkButton href="/retirar" variant="cta" className="w-full">
          Pasar a mi banco
        </LinkButton>
        <Link href="/inicio" className="text-center text-sm font-semibold text-blue hover:underline">
          Volver a mi wallet
        </Link>
      </div>
    </MobileShell>
  );
}
