"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, CopyButton, Markdown, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { keyHeaders } from "@/lib/keys";
import { IconArrowUp, IconImage } from "@/components/icons";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface Result { prompt: string; style: string; brief: string; url: string; fallback: string }

const STYLES = ["Photoreal", "Illustration", "Infographic", "Document scan", "Social post", "Minimal"];

const PRESETS = [
  "Passport photo example with correct framing",
  "Visa document checklist infographic for Australia",
  "Professional visa consultancy office banner",
  "Step-by-step work permit process diagram",
];

export default function ImagesPage() {
  const { push, dismiss } = useToast();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  async function generate(text?: string) {
    const p = (text ?? prompt).trim();
    if (!p || busy) return;
    setBusy(true);
    const t = push("Generating image and art brief...", "loading");
    try {
      const j = await fetch("/api/image", {
        method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ prompt: p, style }),
      }).then((r) => r.json());
      dismiss(t);
      if (!j.ok) { push(j.error ?? "Generation failed.", "error"); return; }
      setResults((r) => [{ prompt: p, style, brief: j.brief ?? "", url: j.url, fallback: j.fallback }, ...r]);
      setPrompt("");
      push("Image ready.", "success");
    } catch {
      dismiss(t);
      push("Generation failed. Please try again.", "error");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Images"
        subtitle="Generate visuals from a prompt, with a matching production art brief"
        actions={<Badge tone="purple">{results.length} generated</Badge>}
      />

      <div className="cx-scroll flex-1 overflow-y-auto px-5 py-6 lg:px-6">
        <div className="mx-auto max-w-[800px]">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <motion.button key={s} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStyle(s)} className={`cx-chip ${style === s ? "cx-chip-on" : ""}`}>
                {s}
              </motion.button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[24px] border border-gray-300 bg-white px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <IconImage width={19} height={19} className="shrink-0 text-gray-500" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void generate(); }}
              placeholder="Describe the image you need..."
              className="flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-gray-400"
            />
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => void generate()} disabled={busy || !prompt.trim()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-30">
              {busy ? <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" /> : <IconArrowUp width={16} height={16} />}
            </motion.button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <motion.button key={p} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="cx-chip" onClick={() => void generate(p)}>
                {p}
              </motion.button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {results.map((r, i) => (
                <motion.div
                  key={`${r.prompt}-${i}`}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
                  className="cx-card overflow-hidden"
                >
                  <img
                    src={r.url}
                    alt={r.prompt}
                    className="w-full bg-[#f8f9fb]"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = r.fallback; }}
                  />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[14px] font-medium">{r.prompt}</div>
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{r.style}</Badge>
                        <a className="cx-btn px-3 py-1 text-[12px]" href={r.url} target="_blank" rel="noreferrer" download>Download</a>
                        {r.brief && (
                          <button className="cx-btn px-3 py-1 text-[12px]"
                            onClick={() => setPreview({ title: `Art brief — ${r.prompt}`, body: r.brief })}>
                            Preview &amp; export
                          </button>
                        )}
                        {r.brief && <CopyButton text={r.brief} />}
                      </div>
                    </div>
                    {r.brief && <div className="mt-3"><Markdown text={r.brief} /></div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}
