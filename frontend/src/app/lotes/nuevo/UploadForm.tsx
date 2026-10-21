"use client";

import { startTransition, useActionState, useMemo, useRef, useState } from "react";
import { LoteInterpretacion, type LotePreviewRow } from "@/components/LoteInterpretacion";
import { Button, Field, FormError, Input, SubmitButton } from "@/components/ui";
import {
  detectColumns,
  detectMode,
  parseSpreadsheetFile,
  reviewLote,
  spreadsheetFileError,
  type LoteMode,
  type ParsedRow,
} from "@/lib/excel";
import { parseCop } from "@/lib/money";
import { checkLoteRecipients, createLoteFromUpload } from "@/lib/server/lote-actions";

export function UploadForm() {
  const [state, action, pending] = useActionState(createLoteFromUpload, { error: null });
  const [mode, setMode] = useState<LoteMode>("amounts");
  const [totalText, setTotalText] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(
    null,
  );
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [recipients, setRecipients] = useState<Awaited<ReturnType<typeof checkLoteRecipients>> | null>(null);
  const fileVersion = useRef(0);

  const totalCop = useMemo(() => parseCop(totalText), [totalText]);
  const review = useMemo(
    () => (sheet ? reviewLote(sheet.headers, sheet.rows, mode, totalCop) : null),
    [sheet, mode, totalCop],
  );
  const rows: LotePreviewRow[] | null = review?.rows.map((r) => ({
    ...r,
    key: `r-${r.row}`,
    matched: recipients && !recipients.error ? recipients.registered.includes(r.username) : undefined,
  })) ?? null;
  const missing = rows?.filter((r) => r.matched === false) ?? [];
  const canSave = !!review && !review.errors.length && !!recipients && !recipients.error &&
    !missing.length && !reading && !checking;

  function verifyRecipients(parsed: ParsedRow[], version: number) {
    if (!parsed.length || parsed.length > 40 || parsed.some((r) => !/^[a-z0-9_]{3,20}$/.test(r.username))) return;
    setChecking(true);
    setRecipients(null);
    startTransition(async () => {
      try {
        const result = await checkLoteRecipients(parsed.map((r) => r.username));
        if (fileVersion.current === version) setRecipients(result);
      } catch {
        if (fileVersion.current === version) {
          setRecipients({ error: "No pudimos comprobar las cuentas Orilla. Intenta de nuevo.", registered: [] });
        }
      } finally {
        if (fileVersion.current === version) setChecking(false);
      }
    });
  }

  async function onFileChange(file: File | null) {
    const version = ++fileVersion.current;
    setSheet(null);
    setRecipients(null);
    setChecking(false);
    setParseHint(null);
    setReading(false);
    setFileLabel(file?.name ?? null);
    if (!file) {
      return;
    }
    const fileError = spreadsheetFileError(file);
    if (fileError) {
      setParseHint(fileError);
      return;
    }
    setReading(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (fileVersion.current !== version) return;
      if (!parsed.headers.length) {
        setParseHint("No encontramos columnas en ese archivo.");
        return;
      }
      const detected = detectMode(detectColumns(parsed.headers));
      setMode(detected);
      setSheet(parsed);
      verifyRecipients(reviewLote(parsed.headers, parsed.rows, detected, null).rows, version);
    } catch {
      if (fileVersion.current === version) setParseHint("No pudimos leer ese archivo. Usa la plantilla Excel o CSV UTF-8.");
    } finally {
      if (fileVersion.current === version) setReading(false);
    }
  }

  return (
    <form
      action={action}
      onSubmit={(e) => { if (!canSave) e.preventDefault(); }}
      onReset={() => void onFileChange(null)}
      className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
    >
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
        <Field label="Nombre del lote">
          <Input name="name" placeholder="Lobby Dann · viernes 19" required minLength={2} maxLength={120} />
        </Field>

        <Field
          label="Excel o CSV"
          hint="Excel o CSV, máximo 1,5 MB y 40 personas. Incluye usuario y monto_cop (o %). Una fila por persona, con montos en pesos colombianos."
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
          {reading ? <p role="status" className="mt-1 text-xs text-blue">Leyendo archivo…</p> : null}
          {parseHint ? <p role="alert" className="mt-1 text-xs text-danger">{parseHint}</p> : null}
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
                  placeholder="Ej. 1300000"
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

        {review ? (
          <div role={review.errors.length ? "alert" : "status"} className="rounded-xl border border-line bg-bg-soft p-4 text-sm">
            {review.errors.length ? (
              <>
                <p className="font-semibold text-danger">Corrige el archivo antes de continuar</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-danger">
                  {review.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
                <p className="mt-2 text-xs text-ink-muted">Revisa el detalle por fila en la vista previa y vuelve a subir el archivo corregido.</p>
              </>
            ) : <p className="font-semibold text-ink">{review.rows.length} destinatarios · montos revisados</p>}
            {checking ? <p className="mt-2 text-ink-muted">Comprobando cuentas Orilla…</p> : null}
            {missing.length ? <p className="mt-2 text-danger">{missing.length} destinatario(s) sin cuenta Orilla. Corrige su @usuario o pide que se registre antes de guardar.</p> : null}
            {canSave ? <p className="mt-2 text-success">Todas las cuentas están verificadas. Revisa quién recibe cuánto antes de guardar.</p> : null}
            <FormError message={recipients?.error ?? null} />
            {(missing.length > 0 || recipients?.error) && !checking ? (
              <Button type="button" variant="ghost" className="mt-3" onClick={() => verifyRecipients(review.rows, fileVersion.current)}>
                Volver a comprobar cuentas
              </Button>
            ) : null}
          </div>
        ) : null}

      </fieldset>

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
              Sube el Excel o CSV y aquí verás cada <strong className="text-ink">@usuario</strong> frente a{" "}
              <strong className="text-ink">cuánto recibe</strong> — en pesos o en % convertido al
              total.
            </p>
            <p className="mt-4 text-xs">
              Descargar plantilla Excel:{" "}
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

      <div className="flex flex-col gap-3 lg:col-span-2">
        <FormError message={state.error} />
        <p className="text-xs text-ink-muted">Guardar crea un borrador. Los pagos se envían después, al cerrar la noche.</p>
        <SubmitButton variant="cta" pending={pending} disabled={!canSave} pendingLabel="Guardando borrador…" className="w-full lg:w-fit">
          Confirmar y guardar borrador
        </SubmitButton>
      </div>
    </form>
  );
}
