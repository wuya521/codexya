import Link from "next/link";

type ModeCardProps = {
  href: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
};

export function ModeCard({
  href,
  label,
  title,
  description,
  bullets
}: ModeCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-line bg-panel p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-brand/40"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-brand">
          {label}
        </span>
        <span className="text-sm text-muted transition group-hover:text-brand">
          进入
        </span>
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <ul className="mt-6 space-y-2 text-sm text-ink/85">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-brand" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
