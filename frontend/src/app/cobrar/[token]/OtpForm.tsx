"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { workerDemo } from "@/lib/mock";

export function OtpForm({ token }: { token: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState(workerDemo.otpMock);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.replace(/\s/g, "") !== workerDemo.otpMock) {
      setError("Código incorrecto. Usa el mock 4821.");
      return;
    }
    router.push(`/cobrar/${token}/pago`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <Field label="Celular">
        <Input defaultValue={workerDemo.celular} readOnly />
      </Field>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink-muted">
          Código SMS (mock)
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
          Código mock: 4821 · no es un SMS real
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
