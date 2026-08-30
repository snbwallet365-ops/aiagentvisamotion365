"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface Toast { id: number; text: string; tone: "info" | "success" | "error" | "loading" }
interface Ctx { push: (text: string, tone?: Toast["tone"], ms?: number) => number; dismiss: (id: number) => void }

const ToastContext = createContext<Ctx>({ push: () => 0, dismiss: () => {} });
export const useToast = () => useContext(ToastContext);

let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setItems((x) => x.filter((t) => t.id !== id)), []);

  const push = useCallback((text: string, tone: Toast["tone"] = "info", ms = 3200) => {
    const id = seq++;
    setItems((x) => [...x, { id, text, tone }]);
    if (tone !== "loading") setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div key={t.id} className="cx-glass cx-in pointer-events-auto flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px]">
            {t.tone === "loading" && (
              <span className="cx-spin h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 border-t-gray-800" />
            )}
            {t.tone === "success" && <span className="text-[#16a34a]">✓</span>}
            {t.tone === "error" && <span className="text-[#dc2626]">✕</span>}
            <span className="flex-1 text-[#1f2937]">{t.text}</span>
            <button className="text-[12px] text-gray-400 hover:text-gray-700" onClick={() => dismiss(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
