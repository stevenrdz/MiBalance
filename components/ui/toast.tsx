"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  tone: ToastTone;
};

type ToastContextValue = {
  pushToast: (title: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const pushToast = useCallback((title: string, tone: ToastTone = "info") => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {items.map((item) => (
          <div
            className={cn(
              "min-w-72 rounded-xl border px-4 py-3 text-sm font-medium shadow-soft",
              item.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
              item.tone === "error" && "border-red-200 bg-red-50 text-red-900",
              item.tone === "info" && "border-ink-200 bg-white text-ink-900"
            )}
            key={item.id}
          >
            {item.title}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  }

  return {
    success: (title: string) => context.pushToast(title, "success"),
    error: (title: string) => context.pushToast(title, "error"),
    info: (title: string) => context.pushToast(title, "info")
  };
}
