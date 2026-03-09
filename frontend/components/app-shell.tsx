import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,95,52,0.14),_transparent_26%),radial-gradient(circle_at_84%_14%,_rgba(25,72,107,0.12),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(74,116,93,0.08),_transparent_20%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35)_0,transparent_18%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18)_0,transparent_20%)] opacity-60" />
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
