import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { PaymentPhase } from "@/lib/payments";

const baseBtn =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-3.5 text-[15px] font-semibold cursor-pointer transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2";

type Variant = "primary" | "ghost" | "cta";

const variantStyles: Record<Variant, string> = {
  primary: "bg-blue text-white hover:brightness-90 hover:shadow-md",
  ghost: "border border-line bg-white text-ink hover:border-blue hover:bg-bg-soft hover:text-blue",
  cta: "bg-orilla-gradient text-white shadow-sm hover:brightness-90 hover:shadow-md",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button className={`${baseBtn} ${styles} ${className}`} {...props} />
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

export function LinkButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Link className={`${baseBtn} ${styles} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function StatusChip({ phase }: { phase: PaymentPhase }) {
  const map = {
    processing: ["Procesando", "bg-[#F4F1E6] text-warn"],
    confirming: ["Confirmando pago", "bg-[#F4F1E6] text-warn"],
    received: ["Recibido, sin repartir", "bg-[#E8F4FA] text-blue"],
    distributing: ["Repartiendo", "bg-[#E8F4FA] text-blue"],
    distributed: ["Repartido", "bg-[#E6F6EF] text-success"],
    payment_failed: ["El pago no salió", "bg-[#FCEAEA] text-danger"],
    distribution_failed: ["Falló el reparto", "bg-[#FCEAEA] text-danger"],
  } as const;
  const [label, style] = map[phase];

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  pending,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingLabel: string;
  pending: boolean;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[10px] border border-danger/30 bg-[#FCEAEA] px-3.5 py-3 text-sm text-danger"
    >
      {message}
    </p>
  );
}

export function TxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <a
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[13px] font-semibold text-blue hover:underline"
    >
      {label ?? `${hash.slice(0, 10)}…${hash.slice(-6)}`}
    </a>
  );
}

const SHARE_COLORS = ["#0b7ba8", "#1fa87a", "#e6c34a", "#5a6f7a", "#7fc4de", "#9ad9be"];

export function shareColor(index: number) {
  return SHARE_COLORS[index % SHARE_COLORS.length];
}

/** Barra apilada con el % de cada integrante. */
export function ShareBar({ shares }: { shares: { label: string; bps: number }[] }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-line" aria-hidden>
      {shares.map((s, i) => (
        <div
          key={`${s.label}-${i}`}
          title={`${s.label}: ${s.bps / 100}%`}
          style={{ width: `${Math.min(s.bps, 10_000) / 100}%`, background: shareColor(i) }}
          className="h-full border-r border-white last:border-r-0"
        />
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-[10px] border border-line bg-bg-soft px-3.5 py-3 text-sm text-ink outline-none focus:border-blue focus-visible:ring-2 focus-visible:ring-blue/40 ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] border border-line bg-white ${className}`}
    >
      {children}
    </div>
  );
}
