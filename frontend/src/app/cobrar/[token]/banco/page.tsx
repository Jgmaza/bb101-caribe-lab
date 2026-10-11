import Link from "next/link";
import { MobileShell } from "@/components/MobileShell";
import { Field, Input, LinkButton } from "@/components/ui";
import { formatCop, workerDemo } from "@/lib/mock";

export default async function BancoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell
        left={
          <Link href={`/cobrar/${token}/pago`} className="font-semibold text-blue">
            ← Atrás
          </Link>
        }
        right={<span className="text-xs text-ink-muted">2 / 3</span>}
      >
        <h1 className="font-display text-[28px] font-bold text-ink">
          Enviar a Bancolombia
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Vas a retirar {formatCop(workerDemo.monto)} desde tu saldo Orilla a tu
          cuenta. Flujo sandbox / mock.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <Field label="Banco">
            <Input defaultValue={workerDemo.banco} readOnly />
          </Field>
          <Field label="Tipo de cuenta">
            <Input defaultValue="Ahorros" readOnly />
          </Field>
          <Field label="Número / llave">
            <Input defaultValue={workerDemo.cuenta} readOnly />
          </Field>
          <Field label="Titular">
            <Input defaultValue={workerDemo.nombre} readOnly />
          </Field>
          <LinkButton href={`/cobrar/${token}/exito`} className="w-full">
            Confirmar envío
          </LinkButton>
        </div>
      </MobileShell>
    </div>
  );
}
