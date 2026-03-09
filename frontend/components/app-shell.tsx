import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { ToastViewport } from "@/components/toast-viewport";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(74,128,255,0.12),_transparent_28%),radial-gradient(circle_at_88%_12%,_rgba(0,189,255,0.1),_transparent_20%),radial-gradient(circle_at_60%_100%,_rgba(11,73,152,0.06),_transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,250,255,0.4))]" />
      </div>
      <div className="relative">
        <SiteHeader />
        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
          {children}
        </main>
        <ToastViewport />
      </div>
    </div>
  );
}
