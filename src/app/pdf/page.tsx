"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, CopyButton, Markdown, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { keyHeaders } from "@/lib/keys";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });
import { motion } from "framer-motion";
import { IconArrowUp, IconPdf, IconPlus, IconTrash } from "@/components/icons";

interface Doc {
  id: number; filename: string; sizeBytes: number; pages: number; chars: number;
  chunkCount: number; status: string; summary: string; createdAt: string;
}
interface Source { n: number; filename: string; page: number; score: number; snippet: string }
interface Msg { role: "user" | "assistant"; content: string; sources?: Source[] }

const STAGES = [
  "Validating file type and size",
  "Extracting text and chunking document...",
  "Embedding chunks into the vector index",
  "Storing vectors with page metadata",
];

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function PdfSpacePage() {
  const { push, dismiss } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(0);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const j = await fetch("/api/pdf").then((r) => r.json());
    setDocs(j.docs ?? []);
    setSelected((s) => (s.length ? s : (j.docs ?? []).map((d: Doc) => d.id)));
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handlePDFUpload(file: File) {
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      push("Only PDF files are accepted.", "error"); return;
    }
    if (file.size > 20 * 1024 * 1024) {
      push("File exceeds the 20MB limit.", "error"); return;
    }
    setUploading(true); setStage(0);
    const t = push(STAGES[1], "loading");
    const timer = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 900);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/pdf", { method: "POST", body: fd, headers: keyHeaders() });
      const j = await res.json();
      clearInterval(timer); dismiss(t); setUploading(false);
      if (!res.ok) { push(j.error ?? "Upload failed.", "error", 4500); return; }
      push(`PDF Ready for Query — ${j.chunkCount} chunks · ${j.pages} pages`, "success", 4500);
      setSelected((s) => [...new Set([...s, j.docId])]);
      await load();
    } catch {
      clearInterval(timer); dismiss(t); setUploading(false);
      push("Network error during upload.", "error");
    }
  }

  async function remove(id: number) {
    await fetch(`/api/pdf?id=${id}`, { method: "DELETE" });
    setSelected((s) => s.filter((x) => x !== id));
    push("Document removed from the index.", "success");
    void load();
  }

  async function ask(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    if (selected.length === 0) { push("Select at least one document first.", "error"); return; }
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);

    const patch = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => { const c = [...prev]; c[c.length - 1] = fn(c[c.length - 1]); return c; });

    try {
      const res = await fetch("/api/pdf/query", {
        method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ query: q, docIds: selected }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.trim().startsWith("data:")) continue;
          const ev = JSON.parse(p.trim().slice(5)) as { type: string; text?: string; sources?: Source[] };
          if (ev.type === "delta" && ev.text) patch((m) => ({ ...m, content: m.content + ev.text }));
          else if (ev.type === "sources") patch((m) => ({ ...m, sources: ev.sources }));
        }
      }
    } catch {
      patch((m) => ({ ...m, content: m.content + "\n\n_Query failed. Please try again._" }));
    } finally { setBusy(false); }
  }

  const totalChunks = docs.reduce((s, d) => s + d.chunkCount, 0);

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="PDF Space"
        subtitle="Upload documents, then ask grounded questions answered only from their content"
        actions={
          <>
            <Badge tone="blue">{docs.length} docs · {totalChunks} chunks</Badge>
            <button className="cx-btn cx-btn-dark" onClick={() => fileRef.current?.click()}>
              <IconPlus width={15} height={15} /> Upload PDF
            </button>
          </>
        }
      />

      <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
        onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => void handlePDFUpload(f)); e.target.value = ""; }} />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_1fr]">
        {/* Library */}
        <div className="cx-scroll overflow-y-auto border-b border-[var(--color-line)] p-4 lg:border-b-0 lg:border-r">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); Array.from(e.dataTransfer.files).forEach((f) => void handlePDFUpload(f)); }}
            onClick={() => fileRef.current?.click()}
            className={`mb-4 cursor-pointer rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
              drag ? "border-gray-900 bg-[var(--color-hover)]" : "border-gray-300 bg-white hover:bg-[var(--color-hover)]"
            }`}
          >
            <IconPdf width={26} height={26} className="mx-auto mb-2 text-gray-400" />
            <p className="text-[13.5px] font-medium">Drop a PDF or click to upload</p>
            <p className="mt-1 text-[11.5px] text-gray-500">application/pdf · max 20MB · 500-token chunks</p>
          </div>

          {uploading && (
            <div className="cx-card mb-4 p-4">
              <div className="mb-2 flex items-center gap-2 text-[12.5px] font-medium">
                <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-gray-900" />
                {STAGES[stage]}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="cx-progress h-full rounded-full bg-black" />
              </div>
              <ol className="mt-3 space-y-1">
                {STAGES.map((s, i) => (
                  <li key={s} className={`text-[11.5px] ${i < stage ? "text-[#16a34a]" : i === stage ? "text-[#111827]" : "text-gray-400"}`}>
                    {i < stage ? "✓" : "○"} {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {docs.length === 0 && !uploading ? (
            <p className="px-1 text-sm text-gray-500">No documents yet. Upload a PDF to build your vector index.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => {
                const on = selected.includes(d.id);
                return (
                  <div key={d.id} className={`cx-card p-3.5 transition-colors ${on ? "border-gray-900" : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => setSelected((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))}
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] ${on ? "border-black bg-black text-white" : "border-gray-300"}`}
                      >
                        {on ? "✓" : ""}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{d.filename}</div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {d.pages} pages · {d.chunkCount} chunks · {kb(d.sizeBytes)}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Badge tone={d.status === "ready" ? "green" : "amber"}>{d.status === "ready" ? "Indexed" : d.status}</Badge>
                          <button className="text-gray-400 hover:text-[#b91c1c]" onClick={() => void remove(d.id)} title="Delete">
                            <IconTrash width={14} height={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Query area */}
        <div className="flex min-h-0 flex-col">
          <div className="cx-scroll flex-1 overflow-y-auto px-5 py-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-[720px] flex-col items-center justify-center text-center">
                <h2 className="cx-display text-[22px] font-medium text-[#111827]">Ask anything about your PDFs</h2>
                <p className="mt-2 max-w-md text-[13.5px] text-gray-500">
                  Every answer is grounded in the retrieved chunks and cited with the source page number.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["Summarize this document", "List every requirement mentioned", "What are the deadlines?", "Extract all fees and amounts"].map((q) => (
                    <button key={q} className="cx-chip" onClick={() => void ask(q)}>{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-[760px] space-y-6">
                {messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#f3f4f6] px-4 py-2.5 text-[14.5px] text-[#111827]">{m.content}</div>
                      </div>
                    ) : (
                      <div>
                        {m.sources && m.sources.length > 0 && (
                          <div className="mb-3 space-y-1.5 rounded-xl border border-[var(--color-line)] bg-white p-3">
                            <div className="text-[11.5px] font-medium uppercase tracking-wide text-gray-500">Retrieved context</div>
                            {m.sources.map((s) => (
                              <div key={s.n} className="text-[11.5px] text-gray-600">
                                <span className="font-medium text-[#111827]">[{s.n}] {s.filename} · p.{s.page}</span>
                                <span className="ml-1.5 text-gray-400">score {s.score}</span>
                                <div className="mt-0.5 line-clamp-2 text-gray-500">{s.snippet}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {m.content ? (
                          <>
                            <Markdown text={m.content} />
                            {!busy && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <CopyButton text={m.content} />
                                <button
                                  className="cx-btn px-3 py-1 text-[12px]"
                                  onClick={() => setPreview({
                                    title: messages[i - 1]?.content?.slice(0, 80) || "PDF Space answer",
                                    body: m.content,
                                  })}
                                >
                                  Preview &amp; export
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="cx-shimmer h-3 w-2/3 rounded-full" />
                            <div className="cx-shimmer h-3 w-1/2 rounded-full" />
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-line)] px-5 py-3.5">
            <div className="mx-auto flex max-w-[760px] items-center gap-2 rounded-[24px] border border-gray-300 bg-white px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button onClick={() => fileRef.current?.click()} className="shrink-0 rounded-full p-1 text-gray-500 hover:bg-[var(--color-hover)] hover:text-gray-900">
                <IconPlus width={19} height={19} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void ask(); }}
                placeholder={selected.length ? "Ask a question about the selected PDFs..." : "Upload and select a PDF to begin..."}
                className="flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-gray-400"
              />
              <button
                onClick={() => void ask()}
                disabled={busy || !input.trim()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-30"
              >
                {busy ? <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" /> : <IconArrowUp width={16} height={16} />}
              </button>
            </div>
            <p className="cx-micro mt-2.5 text-center text-xs text-gray-400">
              VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
            </p>
          </div>
        </div>
      </div>

      <DocPreview doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
