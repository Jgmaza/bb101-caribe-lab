import Link from "next/link";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: { mark: "h-8 w-8", text: "text-2xl", gap: "gap-2.5" },
  md: { mark: "h-10 w-10", text: "text-[2rem]", gap: "gap-3" },
  lg: { mark: "h-12 w-12", text: "text-[2.5rem]", gap: "gap-3.5" },
} as const;

export function Logo({ href = "/", size = "md" }: Props) {
  const { mark, text, gap } = SIZES[size];

  const content = (
    <span className={`inline-flex items-center ${gap}`}>
      <span className={`bg-orilla-gradient ${mark} shrink-0 rounded-[10px] shadow-sm`} />
      <span className={`font-display font-bold tracking-tight text-orilla-gradient ${text}`}>
        Orilla
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex shrink-0">
      {content}
    </Link>
  );
}
