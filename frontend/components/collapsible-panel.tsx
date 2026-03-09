"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type CollapsiblePanelProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  defaultOpen?: boolean;
  summary?: string;
  children: ReactNode;
};

export function CollapsiblePanel({
  title,
  eyebrow,
  description,
  defaultOpen = false,
  summary,
  children
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[1.6rem] border border-line bg-panel p-6 shadow-panel backdrop-blur">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-4 text-left"
        onClick={() => setIsOpen((current) => !current)}
      >
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {summary ? <span className="status-pill">{summary}</span> : null}
          <span className="button-secondary px-4 py-2">
            {isOpen ? "收起" : "展开"}
          </span>
        </div>
      </button>
      {isOpen ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
