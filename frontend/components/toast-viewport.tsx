"use client";

import { useEffect } from "react";

import { useToastStore } from "@/store/toast-store";

const toneStyles = {
  success: "border-success/20 bg-white/95 text-ink",
  error: "border-warning/20 bg-white/95 text-ink",
  info: "border-brand/20 bg-white/95 text-ink"
} as const;

const dotStyles = {
  success: "bg-success",
  error: "bg-warning",
  info: "bg-brand"
} as const;

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);

  useEffect(() => {
    const timers = items.map((item) =>
      window.setTimeout(() => remove(item.id), 3200)
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [items, remove]);

  if (!items.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-5 top-20 z-[70] flex w-[min(92vw,24rem)] flex-col gap-3 lg:right-8">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-[1.35rem] border px-4 py-4 shadow-[0_18px_40px_rgba(15,37,62,0.12)] backdrop-blur ${toneStyles[item.tone]}`}
        >
          <div className="flex items-start gap-3">
            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotStyles[item.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs text-muted transition hover:bg-canvas hover:text-ink"
              onClick={() => remove(item.id)}
            >
              关闭
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
