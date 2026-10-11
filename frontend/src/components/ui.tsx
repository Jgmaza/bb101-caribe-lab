import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const baseBtn =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.99] disabled:opacity-50";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "cta";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-blue text-white hover:brightness-105",
    ghost: "border border-line bg-white text-ink hover:bg-bg-soft",
    cta: "bg-orilla-gradient text-white shadow-sm hover:brightness-105",
  }[variant];

  return (
    <button className={`${baseBtn} ${styles} ${className}`} {...props} />
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "ghost" | "cta";
  className?: string;
  children: ReactNode;
};

export function LinkButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  const styles = {
    primary: "bg-blue text-white hover:brightness-105",
    ghost: "border border-line bg-white text-ink hover:bg-bg-soft",
    cta: "bg-orilla-gradient text-white shadow-sm hover:brightness-105",
  }[variant];

  return (
    <Link className={`${baseBtn} ${styles} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function StatusChip({
  status,
}: {
  status: "Listo" | "Programado" | "Borrador" | "Ok" | "Pendiente" | "Fallido";
}) {
  const map: Record<string, string> = {
    Listo: "bg-[#E6F6EF] text-success",
    Ok: "bg-[#E6F6EF] text-success",
    Programado: "bg-[#E8F4FA] text-blue",
    Borrador: "bg-[#F4F1E6] text-warn",
    Pendiente: "bg-[#F4F1E6] text-warn",
    Fallido: "bg-[#FCEAEA] text-danger",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-[10px] border border-line bg-bg-soft px-3.5 py-3 text-sm text-ink outline-none focus:border-blue ${className}`}
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
