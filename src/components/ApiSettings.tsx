"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EMPTY_KEYS, KEY_FIELDS, clearKeys, loadKeys, maskKey, saveKeys, type UserKeys } from "@/lib/keys";
import { useToast } from "@/components/Toast";
import { IconCheck } from "@/components/icons";

export default function ApiSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useToast();
  const [keys, setKeys] = useState<UserKeys>(EMPTY_KEYS);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, "ok" | "fail" | undefined>>({});

  useEffect(() => { if (open) setKeys(loadKeys()); }, [open]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  async function verify(id: keyof UserKeys) {
    const value = keys[id].trim();
    if (!value) { push("Enter a key first.", "error"); return; }
    setTesting(id);
    try {
      const res = await fetch("/api/keys/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id, key: value }),
      });
      const j = await res.json();
      setStatus((s) => ({ ...s, [id]: j.ok ? "ok" : "fail" }));
      push(j.ok ? `${id} key verified successfully.` : `${id} key rejected: ${j.reason ?? "invalid"}`, j.ok ? "success" : "error");
    } catch {
      setStatus((s) => ({ ...s, [id]: "fail" }));
      push("Verification request failed.", "error");
    } finally { setTesting(null); }
  }

  function persist() {
    saveKeys(keys);
    push("API keys saved to this browser.", "success");
    onClose();
  }

  function wipe() {
    clearKeys();
    setKeys(EMPTY_KEYS);
    setStatus({});
    push("All keys removed from this browser.", "success");
  }

  const activeCount = Object.values(keys).filter((v) => v.trim()).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          <motion.div
            className="cx-glass relative z-10 max-h-[88vh] w-full max-w-lg overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <div>
                <h2 className="cx-display text-[16px] font-semibold">API Settings</h2>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  Bring your own key — stored only in this browser, never on our servers.
                </p>
              </div>
              <button className="cx-btn h-8 w-8 !p-0" onClick={onClose}>✕</button>
            </div>

            <div className="cx-scroll max-h-[58vh] space-y-4 overflow-y-auto px-5 py-4">
              {KEY_FIELDS.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.22 }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[13px] font-medium">{f.label}</label>
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-[11.5px] text-gray-500 underline hover:text-gray-900">
                      Get key ↗
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type={reveal[f.id] ? "text" : "password"}
                      value={keys[f.id]}
                      onChange={(e) => { setKeys({ ...keys, [f.id]: e.target.value }); setStatus((s) => ({ ...s, [f.id]: undefined })); }}
                      placeholder={f.placeholder}
                      className="cx-input flex-1 font-mono text-[12.5px]"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button className="cx-btn px-3 py-1.5 text-[12px]" onClick={() => setReveal((r) => ({ ...r, [f.id]: !r[f.id] }))}>
                      {reveal[f.id] ? "Hide" : "Show"}
                    </button>
                    <button className="cx-btn px-3 py-1.5 text-[12px]" disabled={testing === f.id} onClick={() => void verify(f.id)}>
                      {testing === f.id ? <span className="cx-spin h-3 w-3 rounded-full border-2 border-gray-300 border-t-gray-800" /> : "Test"}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="flex-1 text-[11.5px] text-gray-500">{f.help}</p>
                    <AnimatePresence>
                      {status[f.id] === "ok" && (
                        <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1 text-[11.5px] font-medium text-[#16a34a]">
                          <IconCheck /> Verified
                        </motion.span>
                      )}
                      {status[f.id] === "fail" && (
                        <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="text-[11.5px] font-medium text-[#b91c1c]">Invalid</motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {keys[f.id] && !reveal[f.id] && (
                    <p className="mt-1 font-mono text-[11px] text-gray-400">{maskKey(keys[f.id])}</p>
                  )}
                </motion.div>
              ))}

              <div className="rounded-xl border border-[var(--color-line)] bg-white/70 p-3.5 text-[11.5px] leading-relaxed text-gray-500">
                কোনো কী না দিলেও প্ল্যাটফর্ম সম্পূর্ণ কাজ করে — অভ্যন্তরীণ ভিসা ইঞ্জিন উত্তর দেয়।
                কী যোগ করলে উত্তর আরও সমৃদ্ধ হয় এবং Exa দিয়ে লাইভ নীতি অনুসন্ধান চালু হয়।
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--color-line)] px-5 py-3.5">
              <span className="text-[12px] text-gray-500">{activeCount} of 3 configured</span>
              <div className="flex gap-2">
                <button className="cx-btn" onClick={wipe}>Clear all</button>
                <button className="cx-btn cx-btn-dark" onClick={persist}>Save keys</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
