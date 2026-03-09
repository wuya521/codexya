"use client";

import Link from "next/link";

type PageStatusProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function PageStatus({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel
}: PageStatusProps) {
  return (
    <div className="grid gap-6 rounded-[2rem] border border-line bg-panel p-7 shadow-panel lg:grid-cols-[1.2fr_0.8fr]">
      <section className="max-w-4xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-title mt-4 text-4xl font-semibold text-ink">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {description}
        </p>
      </section>
      <div className="rounded-[1.5rem] border border-line bg-canvas/80 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#13263b,#21486b)] text-sm font-semibold text-white shadow-panel">
          OS
        </div>
        <p className="mt-5 text-sm font-semibold text-ink">当前页面状态</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          如果是首次加载，通常是正在连接真实账户、任务或后台接口；如果停留过久，通常意味着后端未启动或当前账号无权限。
        </p>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="button-primary mt-5">
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
