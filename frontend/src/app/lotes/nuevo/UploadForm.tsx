"use client";

import { useActionState, useMemo, useState } from "react";
import { LoteInterpretacion, type LotePreviewRow } from "@/components/LoteInterpretacion";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import {
  detectColumns,
  detectMode,
  mapRows,
  parseSpreadsheetFile,
  type LoteMode,
} from "@/lib/excel";
import { parseCop } from "@/lib/money";
import { createLoteFromUpload } from "@/lib/server/lote-actions";

function toPreview(
  headers: string[],
  raw: Record<string, string>[],
  mode: LoteMode,
): LotePreviewRow[] {
  if (!headers.length) return [];
  const map = detectColumns(headers);
  return mapRows(raw, map, mode)
    .filter((r) => r.username || r.displayName || r.phone)
    .map((r, i) => ({
      key: `r-${i}`,
      username: r.username,
      displayName: r.displayName,
      role: r.role,
      amountCop: r.amountCop,
      shareBps: r.shareBps,
      errors: r.errors,
    }));
}

export function UploadForm() {
  const [state, action, pending] = useActionState(createLoteFromUpload, { error: null });
  const [mode, setMode] = useState<LoteMode>("amounts");
  const [totalText, setTotalText] = useState("1300000");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(
    null,
  );
  const [parseHint, setParseHint] = useState<string | null>(null);

  const totalCop = useMemo(() => parseCop(totalText), [totalText]);
  const rows = useMemo(
    () => (sheet ? toPreview(sheet.headers, sheet.rows, mode) : null),
    [sheet, mode],
  );

  async function onFileChange(file: File | null) {
    if (!file) {
      setSheet(null);
      setFileLabel(null);
      setParseHint(null);
      return;
    }
    setFileLabel(file.name);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (!parsed.headers.length) {
        setSheet(null);
        setParseHint("No encontramos columnas en ese archivo.");
        return;
      }
      const detected = detectMode(detectColumns(parsed.headers));
      setMode(detected);
      setSheet(parsed);
      const n = toPreview(parsed.headers, parsed.rows, detected).length;
      setParseHint(
        n
          ? `Leímos ${n} fila${n === 1 ? "" : "s"}. Revisa a la derecha quién recibe cuánto.`
          : "El archivo no tiene filas de personas.",
      );
    } catch {
      setSheet(null);
      setParseHint("No pudimos leer ese archivo. Usa el Excel del Entregable 4 o CSV UTF-8.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form action={action} className="flex flex-col gap-5">
        <Field label="Nombre del lote">
          <Input name="name" placeholder="Lobby Dann · viernes 19" required minLength={2} maxLength={120} />
        </Field>

        <Field
          label="Excel o CSV"
          hint="Plantilla (.xlsx/CSV). Montos en pesos colombianos: columnas nombre, usuario, celular, rol, monto_cop (o %). No uses dólares."
        >
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-blue file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white"
          />
          {fileLabel ? <p className="mt-1.5 text-xs text-ink-muted">{fileLabel}</p> : null}
          {parseHint ? <p className="mt-1 text-xs text-blue">{parseHint}</p> : null}
        </Field>

        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-bold text-ink">Cómo se reparte</legend>
          <p className="mb-3 text-xs text-ink-muted">
            Si tu Excel trae pesos por persona, elige montos. Si trae %, indica el total de la noche.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="amounts"
                checked={mode === "amounts"}
                onChange={() => setMode("amounts")}
                className="accent-blue"
              />
              Montos exactos (COP)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="percent"
                checked={mode === "percent"}
                onChange={() => setMode("percent")}
                className="accent-blue"
              />
              Porcentajes (%)
            </label>
          </div>
          {mode === "percent" ? (
            <div className="mt-3">
              <Field label="Total del lote en pesos">
                <Input
                  name="total_cop"
                  placeholder="1300000"
                  inputMode="numeric"
                  value={totalText}
                  onChange={(e) => setTotalText(e.target.value)}
                  required
                />
              </Field>
            </div>
          ) : (
            <input type="hidden" name="total_cop" value="" />
          )}
        </fieldset>

        <Field label="Notas (opcional)">
          <Input name="notes" placeholder="Show lobby, 22:00" maxLength={500} />
        </Field>

        <FormError message={state.error} />

        <SubmitButton variant="cta" pending={pending} pendingLabel="Guardando interpretación…">
          Confirmar y guardar lote
        </SubmitButton>
      </form>

      <aside className="rounded-xl border border-line bg-white p-5 lg:sticky lg:top-6 lg:self-start">
        {rows?.length ? (
          <LoteInterpretacion
            rows={rows}
            mode={mode}
            totalCop={mode === "percent" ? totalCop : null}
            title={`Revisa los pagos · ${rows.length} destinatarios`}
          />
        ) : (
          <div className="text-sm text-ink-muted">
            <p className="font-semibold text-ink">Interpretación del Excel</p>
            <p className="mt-2">
              Sube el CSV y aquí verás cada <strong className="text-ink">@usuario</strong> frente a{" "}
              <strong className="text-ink">cuánto recibe</strong> — en pesos o en % convertido al
              total.
            </p>
            <p className="mt-4 text-xs">
              Descargar Excel (Entregable 4):{" "}
              <a
                href="/Lote-pagos-Orilla-demo.xlsx"
                className="font-semibold text-blue hover:underline"
                download
              >
                montos .xlsx
              </a>
              {" · "}
              <a
                href="/Lote-pagos-Orilla-porcentajes.xlsx"
                className="font-semibold text-blue hover:underline"
                download
              >
                porcentajes .xlsx
              </a>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
