"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";

// SMS real queda para v2: el código es fijo en el MVP.
const OTP_MOCK = "4821";

export function OtpForm({ memberId, phone }: { memberId: string; phone: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState(OTP_MOCK);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.replace(/\s/g, "") !== OTP_MOCK) {
      setError(`Código incorrecto. Usa el código de prueba ${OTP_MOCK}.`);
      return;
    }
    router.push(`/cobrar/${memberId}/saldo`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <Field label="Celular">
        <Input defaultValue={phone} readOnly />
      </Field>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink-muted">
          Código SMS (prueba)
        </p>
        <div className="grid grid-cols-4 gap-2.5">
          {otp
            .padEnd(4, " ")
            .slice(0, 4)
            .split("")
            .map((d, i) => (
              <div
                key={i}
                className="flex h-16 items-center justify-center rounded-xl border-[1.5px] border-blue bg-bg-soft font-display text-[28px] font-bold text-ink"
              >
                {d.trim() || ""}
              </div>
            ))}
        </div>
        <Input
          className="mt-3"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={4}
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
          aria-label="Código OTP"
        />
        <p className="mt-2 text-xs text-ink-muted">
          Código de prueba: {OTP_MOCK} · el SMS real llega en una próxima versión
        </p>
        {error ? (
          <p className="mt-1 text-xs text-danger" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full">
        Continuar
      </Button>
    </form>
  );
}
