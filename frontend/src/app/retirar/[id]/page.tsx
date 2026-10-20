import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { Card, LinkButton, TxLink } from "@/components/ui";
import { formatCop, formatDateTime, shortKey } from "@/lib/format";
import { stroopsToCop } from "@/lib/money";
import type { WithdrawalStatus } from "@/lib/withdrawals";
import { getWithdrawal } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { explorerAccountUrl } from "@/lib/server/stellar";
import { syncWithdrawal } from "@/lib/server/withdrawal-flow";
import { CancelBankWithdrawal, ConfirmBankWithdrawal } from "./BankActions";

const CHIP: Record<WithdrawalStatus, [string, string]> = {
  interactive: ["Falta completar", "bg-[#F4F1E6] text-warn"],
  ready: ["Falta confirmar", "bg-[#F4F1E6] text-warn"],
  sending: ["Enviando", "bg-[#E8F4FA] text-blue"],
  processing: ["En proceso", "bg-[#E8F4FA] text-blue"],
  completed: ["Completado", "bg-[#E6F6EF] text-success"],
  failed: ["No se completó", "bg-[#FCEAEA] text-danger"],
  cancelled: ["Cancelado", "bg-bg-soft text-ink-muted"],
};

// Mientras el banco o la red están trabajando, la página se actualiza sola.
const POLLING: WithdrawalStatus[] = ["interactive", "sending", "processing"];

/** Solo lo ve quien retira (lleva el link a su sesión en el banco de prueba). */
export default async function RetiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/retirar/${encodeURIComponent(id)}`);
  const found = await getWithdrawal(id);
  if (!found || found.user_id !== user.id) notFound();

  let w = found;
  try {
    if (await syncWithdrawal(found)) w = (await getWithdrawal(id)) ?? found;
  } catch (err) {
    // Si el banco de prueba no responde se muestra el último estado conocido.
    console.error(`No se pudo sincronizar el retiro ${id}:`, err);
  }

  const toCop = (stroops: number | null) =>
    stroops === null ? null : stroopsToCop(BigInt(stroops), w.cop_per_xlm);
  const amountCop = toCop(w.amount_stroops) ?? w.amount_cop;
  const feeCop = w.fee_stroops > 0 ? toCop(w.fee_stroops) : null;
  // Lo pedido, como lo espera el formulario del anchor (punto decimal, hasta 2 decimales).
  const anchorAmount = (Math.floor((w.amount_cop / w.cop_per_xlm) * 100) / 100).toFixed(2);
  const [chip, chipStyle] = CHIP[w.status];
  const isBank = w.kind === "banco";

  return (
    <MobileShell
      left={<Logo href="/inicio" size="md" />}
      right={
        <Link href="/inicio" className="text-xs font-semibold text-ink-muted hover:text-blue">
          Mi inicio
        </Link>
      }
    >
      {POLLING.includes(w.status) ? <AutoRefresh seconds={4} /> : null}
      <p className="mt-2 text-xs font-semibold tracking-wide text-blue uppercase">
        {isBank ? "Retiro a tu banco (prueba)" : "Retiro a otra cuenta"}
      </p>
      <h1 className="mt-1 font-display text-[32px] font-bold leading-tight text-ink">
        ≈ {formatCop(amountCop)}
      </h1>
      <span className={`mt-2 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${chipStyle}`}>
        {chip}
      </span>
      <p className="mt-2 text-xs text-ink-muted">{formatDateTime(w.created_at)}</p>

      <div className="mt-5 flex flex-col gap-4">
        {w.status === "interactive" && w.anchor_url ? (
          <Card className="p-5">
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-ink">
              <li>
                Completa los datos de tu banco. Se abre en otra pestaña.
                {/* El formulario del anchor de prueba no recibe el monto que le mandamos. */}
                <span className="mt-1 block text-[13px] text-ink-muted">
                  Donde diga «Amount» escribe <strong className="font-mono text-ink">{anchorAmount}</strong>:
                  son tus ≈ {formatCop(w.amount_cop)} en la moneda del banco de prueba.
                </span>
                <a
                  href={w.anchor_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex w-full items-center justify-center rounded-[10px] bg-blue px-5 py-3 text-[15px] font-semibold text-white hover:brightness-90"
                >
                  Abrir el formulario del banco
                </a>
              </li>
              <li>Vuelve aquí: cuando el banco esté listo te pediremos confirmar el envío.</li>
            </ol>
            <p className="mt-3 text-xs text-ink-muted">Esta página se actualiza sola.</p>
          </Card>
        ) : null}

        {w.status === "ready" ? (
          <Card className="p-5">
            <p className="text-sm font-bold text-ink">El banco está listo para recibir tu retiro</p>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <Row label="Sale de tu saldo">≈ {formatCop(amountCop)}</Row>
              {feeCop !== null ? <Row label="Comisión del banco (incluida)">≈ {formatCop(feeCop)}</Row> : null}
            </dl>
            {w.error ? <p className="mt-3 text-xs text-danger">{w.error}</p> : null}
            <div className="mt-4">
              <ConfirmBankWithdrawal id={w.id} label={`Confirmar y enviar ≈ ${formatCop(amountCop)}`} />
            </div>
          </Card>
        ) : null}

        {w.status === "sending" ? (
          <StatusNote tone="info">
            Estamos enviando tu retiro. {w.error ?? "Tarda unos segundos."}
          </StatusNote>
        ) : null}
        {w.status === "processing" ? (
          <StatusNote tone="info">El dinero ya salió de tu saldo. El banco lo está procesando.</StatusNote>
        ) : null}
        {w.status === "completed" ? (
          <StatusNote tone="success">
            {isBank ? "Listo: el banco completó tu retiro." : "Listo: el dinero llegó a la cuenta de destino."}
          </StatusNote>
        ) : null}
        {w.status === "failed" ? (
          <StatusNote tone="danger">{w.error ?? "El retiro no se completó."}</StatusNote>
        ) : null}
        {w.status === "cancelled" ? (
          <StatusNote tone="muted">Cancelaste este retiro. No se descontó nada de tu saldo.</StatusNote>
        ) : null}

        {w.destination && !isBank ? (
          <dl className="space-y-1.5 text-xs">
            <Row label="Destino">
              <a href={explorerAccountUrl(w.destination)} target="_blank" rel="noreferrer" className="font-mono text-blue hover:underline">
                {shortKey(w.destination)}
              </a>
            </Row>
            {w.memo ? <Row label="Memo">{w.memo}</Row> : null}
            {w.creates_account ? <Row label="Cuenta nueva">se activó con este retiro</Row> : null}
          </dl>
        ) : null}
        {w.stellar_tx_hash && (w.status === "processing" || w.status === "completed") ? (
          <dl className="text-xs">
            <Row label="Comprobante">
              <TxLink hash={w.stellar_tx_hash} />
            </Row>
          </dl>
        ) : null}

        {w.status === "interactive" || w.status === "ready" ? <CancelBankWithdrawal id={w.id} /> : null}
        {w.status === "failed" || w.status === "cancelled" || w.status === "completed" ? (
          <div className="flex gap-3">
            <LinkButton href="/retirar" variant="ghost" className="flex-1 py-2.5 text-sm">
              {w.status === "completed" ? "Otro retiro" : "Intentar de nuevo"}
            </LinkButton>
            <LinkButton href="/inicio" variant="ghost" className="flex-1 py-2.5 text-sm">
              Mi inicio
            </LinkButton>
          </div>
        ) : null}
      </div>
    </MobileShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

function StatusNote({ tone, children }: { tone: "info" | "success" | "danger" | "muted"; children: ReactNode }) {
  const style = {
    info: "bg-[#E8F4FA] text-ink",
    success: "bg-[#E6F6EF] text-success",
    danger: "bg-[#FCEAEA] text-danger",
    muted: "bg-bg-soft text-ink-muted",
  }[tone];
  return <p className={`rounded-[10px] px-3.5 py-3 text-[13px] ${style}`}>{children}</p>;
}
