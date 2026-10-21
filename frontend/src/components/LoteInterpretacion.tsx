import { formatCop } from "@/lib/format";
import { bpsToPercent, splitAmount } from "@/lib/split";
import { ShareBar, shareColor } from "./ui";

export type LotePreviewRow = {
  key: string;
  row?: number;
  username: string;
  displayName: string;
  role: string;
  amountCop: number | null;
  shareBps: number | null;
  matched?: boolean;
  errors?: string[];
};

/** Vista “quién recibe cuánto” (montos o % → pesos), al estilo del reparto de proyectos. */
export function LoteInterpretacion({
  rows,
  mode,
  totalCop,
  title = "Así se interpreta",
}: {
  rows: LotePreviewRow[];
  mode: "amounts" | "percent";
  totalCop: number | null;
  title?: string;
}) {
  const percentReady =
    mode === "percent" &&
    totalCop !== null &&
    totalCop > 0 &&
    rows.every((r) => r.shareBps !== null && r.shareBps > 0) &&
    rows.reduce((a, r) => a + (r.shareBps ?? 0), 0) === 10_000;

  const receives =
    mode === "amounts"
      ? rows.filter((r) => r.amountCop !== null).map((r) => ({ key: r.key, amount: r.amountCop! }))
      : percentReady
        ? splitAmount(
            BigInt(totalCop!),
            rows.map((r) => ({ id: r.key, shareBps: r.shareBps as number })),
          ).map((p) => ({ key: p.id, amount: Number(p.amount) }))
        : null;

  const total =
    mode === "amounts"
      ? rows.reduce((a, r) => a + (r.amountCop ?? 0), 0)
      : totalCop;

  const byKey = new Map((receives ?? []).map((r) => [r.key, r.amount]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="mt-1 text-xs text-ink-muted">
          {mode === "percent"
            ? "Cada @usuario y lo que le toca del total (en pesos)."
            : "Cada @usuario y el monto exacto que recibe."}
        </p>
      </div>

      {mode === "percent" ? (
        <div className="rounded-xl bg-bg-soft p-3">
          <ShareBar
            shares={rows.map((r) => ({
              label: r.username ? `@${r.username}` : r.displayName || "?",
              bps: r.shareBps ?? 0,
            }))}
          />
          {!percentReady && totalCop ? (
            <p className="mt-2 text-xs text-warn">Los % deben sumar 100% para calcular pesos.</p>
          ) : null}
          {mode === "percent" && !totalCop ? (
            <p className="mt-2 text-xs text-warn">Indica el total del lote para ver cuánto recibe cada uno.</p>
          ) : null}
        </div>
      ) : null}

      <ul className="divide-y divide-line">
        {rows.map((r, i) => {
          const amount = byKey.get(r.key);
          const pagoLabel =
            mode === "percent" && r.shareBps != null
              ? `${bpsToPercent(r.shareBps)}%`
              : r.amountCop != null
                ? formatCop(r.amountCop)
                : "—";
          return (
            <li key={r.key} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: shareColor(i) }}
                    aria-hidden
                  />
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {r.displayName || "—"}
                  </p>
                </div>
                <p className="mt-0.5 break-words pl-[18px] text-xs text-ink-muted">
                  {r.row != null ? `Fila ${r.row} · ` : ""}
                  {r.username ? (
                    <span className={r.matched === false ? "text-warn" : undefined}>@{r.username}</span>
                  ) : (
                    <span className="text-warn">sin @usuario</span>
                  )}
                  {r.role ? ` · ${r.role}` : ""}
                  {mode === "percent" ? ` · ${pagoLabel}` : ""}
                </p>
                {r.matched === false ? (
                  <p className="mt-0.5 pl-[18px] text-xs text-danger">
                    Sin cuenta Orilla. Corrige el usuario o pide que se registre.
                  </p>
                ) : r.matched === true ? (
                  <p className="mt-0.5 pl-[18px] text-xs text-success">Cuenta Orilla verificada</p>
                ) : null}
                {r.errors?.length ? (
                  <p className="mt-0.5 break-words pl-[18px] text-xs text-danger">{r.errors.join(" · ")}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold text-ink">
                  {amount != null ? formatCop(amount) : mode === "amounts" ? pagoLabel : "—"}
                </p>
                {mode === "percent" && amount != null ? (
                  <p className="text-[11px] text-ink-muted">recibe</p>
                ) : mode === "amounts" && amount != null ? (
                  <p className="text-[11px] text-ink-muted">recibe</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {total != null && total > 0 ? (
        <div className="rounded-[14px] bg-ink px-5 py-4 text-white">
          <p className="text-[13px] text-[#A8C0CC]">
            {rows.some((r) => r.errors?.length) || (mode === "percent" && !percentReady)
              ? "Total provisional · corrige los errores"
              : "Total a pagar"}
          </p>
          <p className="font-display text-3xl font-bold break-words">{formatCop(total)}</p>
          <p className="mt-1 text-xs text-[#A8C0CC]">
            {rows.length} persona{rows.length === 1 ? "" : "s"}
            {mode === "percent" ? " · por %" : " · montos exactos"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
