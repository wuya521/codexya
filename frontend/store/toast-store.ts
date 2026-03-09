"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastState = {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => string;
  remove: (id: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (toast) => {
    const id = `toast-${crypto.randomUUID()}`;
    set((state) => ({
      items: [...state.items, { ...toast, id }]
    }));
    return id;
  },
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    })),
  clear: () => set({ items: [] })
}));
