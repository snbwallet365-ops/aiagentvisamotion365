"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Markdown, CopyButton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { IconCheck, IconDoc, IconPdf } from "@/components/icons";

export interface PreviewDoc {
  title: string;
  body: string;
  /** Existing stored document id — enables the server-rendered A4 route. */
  docId?: number;
}

type Fmt = "pdf" | "docx" | "doc" | "print";

const FORMATS: { key: Fmt; label: string; hint: string }[] = [
  { key: "pdf", label: "⬇ PDF", hint: "A4, embassy-ready, print safe" },
  { key: "docx", label: "⬇ DOCX", hint: "Editable Word file with tables" },
  { key: "doc", label: "⬇ DOC", hint: "Legacy Word / Google Docs import" },
  { key: "print", label: "🖨️ A4 প্রিন্ট", hint: "Opens the print dialog" },
];

function safeName(title: string) {
  return title.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().replace(/\s+/g, "-").slice(0, 60) || "visamotion-document";
}

/** Rough A4 page estimate so the preview shows a realistic page count. */
function estimatePages(body: string) {
  const lines = body.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 92)), 0);
  return Math.max(1, Math.ceil(lines / 44));
}

export default function DocPreview({ doc, onClose }: { doc: PreviewDoc | null; onClose: () => void }) {
  const { push, dismiss } = useToast();
  const [busy, setBusy] = useState<Fmt | null>(null);
  const [done, setDone] = useState<Fmt | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (doc) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [doc, onClose]);

  const pages = useMemo(() => (doc ? estimatePages(doc.body) : 0), [doc]);
  const words = useMemo(() => (doc ? doc.body.trim().split(/\s+/).length : 0), [doc]);

  async function run(fmt: Fmt) {
    if (!doc || busy) return;
    setBusy(fmt);
    const t = push(fmt === "print" ? "Preparing the A4 print view…" : `Building the ${fmt.toUpperCase()} file…`, "loading");
    try {
      if (fmt === "print") {
        const url = doc.docId
          ? `/api/documents/${doc.docId}?format=print`
          : `/api/export-pdf?format=print&t=${encodeURIComponent(doc.title)}`;
        if (doc.docId) {
          window.open(url, "_blank", "noopener");
        } else {
          const res = await fetch("/api/export-pdf", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: doc.title, content: doc.body, format: "print" }),
          });
          const html = await res.text();
          const w = window.open("", "_blank", "noopener");
          if (w) { w.document.write(html); w.document.close(); }
          else push("Allow pop-ups to open the print view.", "error");
        }
        dismiss(t);
        setDone(fmt);
        setTimeout(() => setDone(null), 1600);
        return;
      }

      const res = doc.docId
        ? await fetch(`/api/documents/${doc.docId}?format=${fmt}`)
        : await fetch("/api/export-pdf", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: doc.title, content: doc.body, format: fmt }),
          });

      dismiss(t);
      if (!res.ok) { push("Export failed. Please try again.", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName(doc.title)}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(fmt);
      setTimeout(() => setDone(null), 1600);
      push(`${fmt.toUpperCase()} downloaded (${(blob.size / 1024).toFixed(0)} KB).`, "success");
    } catch {
      dismiss(t);
      push("Export failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
        >
          <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          <motion.div
            className="cx-glass relative z-10 flex h-full max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] bg-white/70 px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="cx-display truncate text-[15px] font-semibold">{doc.title}</h2>
                <p className="mt-0.5 text-[11.5px] text-gray-500">
                  A4 preview · ~{pages} page{pages > 1 ? "s" : ""} · {words.toLocaleString()} words
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="hidden items-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-1 py-0.5 sm:flex">
                  <button className="px-2 text-[13px] text-gray-500 hover:text-gray-900" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">−</button>
                  <span className="w-10 text-center text-[11.5px] tabular-nums text-gray-600">{Math.round(zoom * 100)}%</span>
                  <button className="px-2 text-[13px] text-gray-500 hover:text-gray-900" onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">+</button>
                </div>
                <CopyButton text={doc.body} />
                <button className="cx-btn h-8 w-8 !p-0" onClick={onClose} aria-label="Close">✕</button>
              </div>
            </div>

            {/* A4 sheet */}
            <div className="cx-scroll flex-1 overflow-auto bg-[#eef0f5] p-4 sm:p-7">
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.28 }}
                className="mx-auto bg-white shadow-[0_10px_40px_rgba(17,24,39,.14)]"
                style={{
                  width: `min(100%, ${794 * zoom}px)`,
                  padding: `${52 * zoom}px ${58 * zoom}px`,
                  fontSize: `${zoom}rem`,
                  transition: "width .2s ease, padding .2s ease",
                }}
              >
                <div className="mb-5 border-b-2 border-[#111827] pb-3">
                  <h1 className="cx-display text-[20px] font-semibold leading-snug">{doc.title}</h1>
                  <p className="mt-1 text-[11px] text-gray-400">
                    VisaMOTion · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <Markdown text={doc.body} />
              </motion.div>
            </div>

            {/* Export bar */}
            <div className="border-t border-[var(--color-line)] bg-white/80 px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="hidden text-[11.5px] text-gray-500 sm:block">
                  Exports keep headings, tables and Bangla text intact.
                </span>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <motion.button
                      key={f.key}
                      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => void run(f.key)}
                      disabled={busy !== null}
                      title={f.hint}
                      className={`cx-btn px-3.5 py-1.5 text-[12.5px] ${f.key === "pdf" ? "cx-btn-dark" : ""}`}
                    >
                      {busy === f.key
                        ? <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current" />
                        : done === f.key
                          ? <IconCheck />
                          : f.key === "pdf" ? <IconPdf width={13} height={13} />
                          : f.key === "docx" || f.key === "doc" ? <IconDoc width={13} height={13} />
                          : null}
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
