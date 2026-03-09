import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(179,92,52,0.12),_transparent_26%),radial-gradient(circle_at_85%_15%,_rgba(25,72,107,0.12),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(64,116,93,0.08),_transparent_20%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:38px_38px] opacity-[0.08]" />
      </div>
      <div className="relative">
        <SiteHeader />
        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
