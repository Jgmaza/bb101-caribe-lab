import { MobileShell } from "@/components/MobileShell";
import { LinkButton } from "@/components/ui";
import { formatCop, workerDemo } from "@/lib/mock";

export default async function ExitoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-bg-soft sm:py-4">
      <MobileShell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#E6F6EF] text-4xl text-success">
            ✓
          </div>
          <h1 className="font-display text-4xl font-bold text-ink">Listo</h1>
          <p className="max-w-[300px] text-[15px] leading-relaxed text-ink-muted">
            {formatCop(workerDemo.monto)} van camino a tu Bancolombia. En demo
            verás confirmación sandbox.
          </p>
          <div className="mt-2 flex w-full flex-col gap-3">
            <LinkButton
              href={`/cobrar/${token}/comprobante`}
              className="w-full"
            >
              Ver comprobante
            </LinkButton>
            <LinkButton href="/" variant="ghost" className="w-full">
              Volver al inicio
            </LinkButton>
          </div>
        </div>
      </MobileShell>
    </div>
  );
}
