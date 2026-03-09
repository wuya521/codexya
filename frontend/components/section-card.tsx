import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  eyebrow,
  description,
  children,
  aside,
  className
}: SectionCardProps) {
  return (
    <section
      className={`rounded-[1.6rem] border border-line bg-panel p-6 shadow-panel backdrop-blur ${className ?? ""}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
