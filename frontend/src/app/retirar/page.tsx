import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { Card } from "@/components/ui";
import { formatBalance, formatCop } from "@/lib/format";
import { stroopsToCop } from "@/lib/money";
import { getWithdrawLimits } from "@/lib/server/anchor";
import { tryCopPerXlm } from "@/lib/server/price";
import { getBalance } from "@/lib/server/queries";
import { requireUser } from "@/lib/server/session";
import { WithdrawForms } from "./WithdrawForms";

/** Rango que acepta el banco de prueba, en pesos de hoy. null si no se pudo consultar. */
async function bankRangeCop(): Promise<{ min: number; max: number | null } | null> {
  try {
    const [limits, rate] = await Promise.all([getWithdrawLimits(), tryCopPerXlm()]);
    if (!limits.enabled || rate === null) return null;
    return {
      min: stroopsToCop(limits.minStroops, rate) + 1,
      max: limits.maxStroops === null ? null : stroopsToCop(limits.maxStroops, rate),
    };
  } catch (err) {
    console.error("No se pudieron leer los límites del anchor:", err);
    return null;
  }
}

export default async function RetirarPage() {
  const user = await requireUser("/retirar");
  const [balance, bankRange] = await Promise.all([getBalance(user.stellar_public_key), bankRangeCop()]);

  return (
    <MobileShell
      left={<Logo href="/inicio" size="sm" />}
      right={
        <Link href="/inicio" className="text-xs font-semibold text-ink-muted hover:text-blue">
          Mi inicio
        </Link>
      }
    >
      <h1 className="mt-2 font-display text-[28px] font-bold leading-tight text-ink">Retirar</h1>
      <Card className="mt-4 p-4">
        <p className="text-xs font-semibold text-ink-muted">Saldo disponible</p>
        <p className="mt-1 font-display text-2xl font-bold text-ink">
          {balance.cop === null ? formatBalance(null) : `≈ ${formatBalance(balance.cop)}`}
        </p>
      </Card>

      <div className="mt-5">
        <WithdrawForms
          requestIds={{ banco: randomUUID(), wallet: randomUUID() }}
          balanceCop={balance.cop}
          bankRange={bankRange}
          bankRangeText={
            bankRange
              ? bankRange.max === null
                ? `desde ≈ ${formatCop(bankRange.min)}`
                : `entre ≈ ${formatCop(bankRange.min)} y ≈ ${formatCop(bankRange.max)}`
              : null
          }
        />
      </div>
    </MobileShell>
  );
}
