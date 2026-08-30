"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge, CopyButton, PageHeader, Stat } from "@/components/ui";
import { useToast } from "@/components/Toast";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface Shade { step: number; hex: string; contrastWhite: number; contrastBlack: number }
interface Palette {
  base: string; ramp: Shade[]; semantic: Record<string, string>;
  tokens: { css: string; tailwind: string }; recommendations: string[];
}

const PRESETS = ["#2f6bff", "#111827", "#0f766e", "#b45309", "#6d28d9", "#b91c1c"];

function grade(ratio: number) {
  if (ratio >= 7) return { label: "AAA", tone: "green" };
  if (ratio >= 4.5) return { label: "AA", tone: "green" };
  if (ratio >= 3) return { label: "AA Large", tone: "amber" };
  return { label: "Fail", tone: "red" };
}

export default function PalettePage() {
  const { push } = useToast();
  const [base, setBase] = useState("#2f6bff");
  const [data, setData] = useState<Palette | null>(null);
  const [tab, setTab] = useState<"css" | "tailwind">("css");
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  function asBrandDoc(d: Palette): PreviewDoc {
    return {
      title: `Brand system — ${d.base.toUpperCase()}`,
      body: [
        `# Brand system`,
        ``,
        `Base colour **${d.base.toUpperCase()}** anchored at step 500.`,
        ``,
        `## Colour ramp`,
        `| Step | Hex | Contrast on white | Contrast on ink |`,
        `| --- | --- | --- | --- |`,
        ...d.ramp.map((s) => `| ${s.step} | ${s.hex.toUpperCase()} | ${s.contrastWhite}:1 | ${s.contrastBlack}:1 |`),
        ``,
        `## Semantic tokens`,
        `| Token | Value |`,
        `| --- | --- |`,
        ...Object.entries(d.semantic).map(([k, v]) => `| ${k} | ${v.toUpperCase()} |`),
        ``,
        `## Typography and spacing`,
        `- Type scale: 12 · 13.5 · 14.5 · 16 · 19 · 24`,
        `- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48`,
        `- Radius: 8 inputs · 16 cards · 999 pills`,
        `- Shadow: 0 4px 6px -1px rgba(0,0,0,.05)`,
        ``,
        `## Usage guidance`,
        ...d.recommendations.map((r) => `- ${r}`),
        ``,
        `> Every pairing above was checked against WCAG 2.1 contrast thresholds.`,
      ].join("\n"),
    };
  }

  const load = useCallback(async (hex: string) => {
    try {
      const j = await fetch(`/api/palette?base=${encodeURIComponent(hex)}`).then((r) => r.json());
      if (j.error) return;
      setData(j);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(base); }, [base, load]);

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Smart colour palette"
        subtitle="One brand colour becomes an 11-step ramp, semantic tokens and WCAG-checked pairings"
        actions={data && <Badge tone="purple">{data.ramp.length} shades · {Object.keys(data.semantic).length} tokens</Badge>}
      />

      <div className="cx-scroll flex-1 overflow-y-auto px-5 py-6 lg:px-6">
        <div className="mx-auto max-w-[900px] space-y-6">
          {/* Input */}
          <div className="cx-card p-5">
            <label className="mb-2 block text-[13px] font-medium">Brand colour</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color" value={base} onChange={(e) => setBase(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--color-line)] bg-white p-1"
                aria-label="Pick brand colour"
              />
              <input
                value={base} onChange={(e) => setBase(e.target.value)}
                className="cx-input w-40 font-mono text-[13px]" spellCheck={false}
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <motion.button
                    key={p} whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
                    onClick={() => setBase(p)}
                    className={`h-8 w-8 rounded-lg border-2 transition-colors ${base.toLowerCase() === p ? "border-gray-900" : "border-transparent"}`}
                    style={{ background: p }} aria-label={p}
                  />
                ))}
              </div>
            </div>
          </div>

          {data && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Base colour" value={data.base.toUpperCase()} hint="anchored at step 500" />
                <Stat label="Text on primary" value={data.semantic.textOnPrimary === "#ffffff" ? "White" : "Ink"} hint="auto-selected for contrast" />
                <Stat label="Primary on white" value={`${data.ramp[5].contrastWhite}:1`} hint={grade(data.ramp[5].contrastWhite).label} />
              </div>

              {/* Ramp */}
              <div className="cx-card overflow-hidden">
                <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">11-step ramp</div>
                <div className="grid grid-cols-1 divide-y divide-[var(--color-line)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-1">
                  {data.ramp.map((s, i) => {
                    const g = grade(Math.max(s.contrastWhite, s.contrastBlack));
                    const onWhite = s.contrastWhite >= s.contrastBlack;
                    return (
                      <motion.div
                        key={s.step}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025, duration: 0.25 }}
                        className="flex items-center gap-4 px-5 py-2.5"
                      >
                        <div className="h-10 w-24 shrink-0 rounded-lg border border-black/5" style={{ background: s.hex }} />
                        <span className="w-12 shrink-0 text-[12px] text-gray-500">{s.step}</span>
                        <code className="w-24 shrink-0 font-mono text-[12.5px]">{s.hex.toUpperCase()}</code>
                        <span
                          className="hidden shrink-0 rounded-md px-2 py-1 text-[11.5px] sm:inline"
                          style={{ background: s.hex, color: onWhite ? "#ffffff" : "#111827" }}
                        >
                          Sample text
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-2">
                          <span className="text-[11.5px] text-gray-500">{Math.max(s.contrastWhite, s.contrastBlack)}:1</span>
                          <Badge tone={g.tone}>{g.label}</Badge>
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Semantic tokens */}
              <div className="cx-card overflow-hidden">
                <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">Semantic tokens</div>
                <div className="grid gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-2">
                  {Object.entries(data.semantic).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2.5 border-b border-dashed border-[#f1f3f8] py-1.5">
                      <span className="h-5 w-5 shrink-0 rounded border border-black/10" style={{ background: v }} />
                      <span className="text-[12.5px]">{k}</span>
                      <code className="ml-auto font-mono text-[11.5px] text-gray-500">{v.toUpperCase()}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="cx-card overflow-hidden">
                <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">Live component preview</div>
                <div className="flex flex-wrap items-center gap-3 p-5">
                  <button className="rounded-full px-4 py-2 text-[13.5px] font-medium"
                    style={{ background: data.semantic.primary, color: data.semantic.textOnPrimary }}>
                    Primary action
                  </button>
                  <button className="rounded-full px-4 py-2 text-[13.5px] font-medium"
                    style={{ background: data.semantic.primarySubtle, color: data.ramp[7].hex, border: `1px solid ${data.semantic.primaryBorder}` }}>
                    Secondary
                  </button>
                  <span className="rounded-full px-3 py-1 text-[12px] font-medium"
                    style={{ background: data.semantic.successSubtle, color: data.semantic.success }}>Success</span>
                  <span className="rounded-full px-3 py-1 text-[12px] font-medium"
                    style={{ background: data.semantic.warningSubtle, color: data.semantic.warning }}>Warning</span>
                  <span className="rounded-full px-3 py-1 text-[12px] font-medium"
                    style={{ background: data.semantic.dangerSubtle, color: data.semantic.danger }}>Danger</span>
                  <div className="w-full rounded-xl p-4"
                    style={{ background: data.semantic.primarySubtle, border: `1px solid ${data.semantic.primaryBorder}` }}>
                    <p className="text-[13px]" style={{ color: data.ramp[8].hex }}>
                      Subtle surface using brand-50 with brand-800 text — readable at every step of the ramp.
                    </p>
                  </div>
                </div>
              </div>

              {/* Guidance */}
              <div className="cx-card p-5">
                <div className="mb-2 text-[14px] font-semibold">Usage guidance</div>
                <ul className="space-y-1.5">
                  {data.recommendations.map((r) => (
                    <li key={r} className="text-[13px] text-[#374151]">• {r}</li>
                  ))}
                </ul>
              </div>

              {/* Tokens */}
              <div className="cx-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3">
                  <div className="flex gap-2">
                    {(["css", "tailwind"] as const).map((t) => (
                      <button key={t} onClick={() => setTab(t)} className={`cx-chip ${tab === t ? "cx-chip-on" : ""}`}>
                        {t === "css" ? "CSS variables" : "Tailwind config"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="cx-btn px-3 py-1 text-[12px]" onClick={() => setPreview(asBrandDoc(data))}>Preview &amp; export</button>
                    <CopyButton text={tab === "css" ? data.tokens.css : data.tokens.tailwind} />
                    <button className="cx-btn px-3 py-1 text-[12px]" onClick={() => {
                      const blob = new Blob([tab === "css" ? data.tokens.css : data.tokens.tailwind], { type: "text/plain" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = tab === "css" ? "brand-tokens.css" : "tailwind-brand.ts";
                      a.click();
                      push("Token file downloaded.", "success");
                    }}>Download</button>
                  </div>
                </div>
                <pre className="cx-scroll max-h-72 overflow-auto bg-[#f8f9fc] p-5 font-mono text-[12px] leading-relaxed">
{tab === "css" ? data.tokens.css : data.tokens.tailwind}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}
