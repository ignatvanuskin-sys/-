"use client";
import * as React from "react";

type Toast = { id: string; title: string; description?: string; variant?: "default" | "destructive" | "success" };
const Ctx = React.createContext<{ toast: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg border px-4 py-3 shadow-lg bg-white text-sm ${t.variant === "destructive" ? "border-red-200 text-red-800" : t.variant === "success" ? "border-green-200 text-green-800" : "border-zinc-200"}`}>
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-xs opacity-80">{t.description}</div>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be inside ToasterProvider");
  return ctx;
}
