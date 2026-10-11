import Link from "next/link";

type Props = {
  href?: string;
  size?: "sm" | "md";
};

export function Logo({ href = "/", size = "md" }: Props) {
  const mark = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const text = size === "sm" ? "text-xl" : "text-[1.6rem]";

  const content = (
    <span className="inline-flex items-center gap-2.5">
      <span className={`bg-orilla-gradient ${mark} rounded-lg shadow-sm`} />
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
