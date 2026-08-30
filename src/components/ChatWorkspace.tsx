"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CopyButton, Markdown } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { keyHeaders, loadKeys } from "@/lib/keys";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });
import { IconArrowUp, IconChevron, IconImage, IconMic, IconPdf, IconPlus } from "@/components/icons";

interface Phase { key: string; label: string; phase: string; status: "running" | "done" }
interface Source { n: number; filename: string; page: number; score: number }
interface Msg {
  role: "user" | "assistant";
  content: string;
  phases?: Phase[];
  attachments?: { name: string; size: number; type: string }[];
  sources?: Source[];
  image?: { url: string; fallback: string; prompt: string; style: string };
}

const MODELS = ["Auto", "Reasoning", "Fast", "Research", "Documents"];

const CHIPS = [
  { label: "Help me write", prompt: "একটি অস্ট্রেলিয়া ওয়ার্ক ভিসার কভার লেটার লিখে দিন" },
  { label: "Check eligibility", prompt: "আমার বয়স ২৯, ব্যাংকে ১৫ হাজার ডলার, জব অফার আছে — কানাডায় যোগ্যতা কত?" },
  { label: "Document checklist", prompt: "দুবাই ওয়ার্ক পারমিটের সম্পূর্ণ ডকুমেন্ট চেকলিস্ট দিন" },
  { label: "Analyze image", prompt: "ছবি বানাও: পাসপোর্ট সাইজ ছবির সঠিক নমুনা" },
];

const MORE_CHIPS = [
  { label: "Compare countries", prompt: "কাতার ও বাহরাইনের ওয়ার্ক ভিসার তুলনা করুন" },
  { label: "Estimate cost", prompt: "জার্মানি ইইউ ব্লু কার্ডের মোট খরচ কত হবে?" },
  { label: "Latest policy", prompt: "ডেনমার্ক পজিটিভ লিস্ট স্কিমের সর্বশেষ বেতন সীমা কত?" },
  { label: "Generate image", prompt: "ছবি বানাও: ভিসা এজেন্সির সোশ্যাল মিডিয়া ব্যানার" },
];

const PHASE_ICON: Record<string, string> = {
  thinking: "◐", searching: "◑", acting: "◒", writing: "◓", reviewing: "◔",
};

const IMAGE_TRIGGER = /(ছবি\s*(বানাও|তৈরি|জেনারেট)|generate\s+(an?\s+)?image|create\s+(an?\s+)?image|draw\s+)/i;

export default function ChatWorkspace({ mode = "chat" }: { mode?: "chat" | "pdf" | "search" }) {
  const router = useRouter();
  const { push, dismiss } = useToast();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("Auto");
  const [modelOpen, setModelOpen] = useState(false);
  const [seeMore, setSeeMore] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [files, setFiles] = useState<{ name: string; size: number; type: string; preview?: string }[]>([]);
  const [pdfIds, setPdfIds] = useState<number[]>([]);
  const [hasKeys, setHasKeys] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => setHasKeys(Object.values(loadKeys()).some((v) => v.trim()));
    sync();
    window.addEventListener("keys-updated", sync);
    return () => window.removeEventListener("keys-updated", sync);
  }, []);

  // Read deep-link params on the client so the shell still prerenders as static HTML.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const params = new URLSearchParams(window.location.search);

    const q = params.get("q");
    if (q) {
      setInput(q);
      requestAnimationFrame(() => areaRef.current?.focus());
    }

    const c = Number(params.get("c"));
    if (!Number.isFinite(c) || c <= 0) return;
    fetch(`/api/conversations?id=${c}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.messages) return;
        setConversationId(c);
        setMessages(j.messages.map((m: { role: string; content: string }) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMessages((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  /* ── PDF Space RAG pipeline ── */
  async function handlePDFUpload(file: File) {
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      push("Only PDF files are supported here.", "error"); return;
    }
    if (file.size > 20 * 1024 * 1024) { push("File exceeds the 20MB limit.", "error"); return; }
    const t1 = push("Extracting text and chunking document...", "loading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/pdf", { method: "POST", body: fd, headers: keyHeaders() });
      const j = await res.json();
      dismiss(t1);
      if (!res.ok) { push(j.error ?? "Upload failed.", "error"); return; }
      const t2 = push("Embedding chunks into the vector index...", "loading");
      setTimeout(() => {
        dismiss(t2);
        push(`PDF Ready for Query — ${j.chunkCount} chunks, ${j.pages} pages`, "success", 4200);
      }, 700);
      setPdfIds((x) => [...new Set([...x, j.docId])]);
    } catch {
      dismiss(t1);
      push("Network error during upload.", "error");
    }
  }

  function onPick(list: File[]) {
    for (const f of list) {
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) void handlePDFUpload(f);
      else setFiles((prev) => [...prev, {
        name: f.name, size: f.size, type: f.type,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }]);
    }
  }

  /* ── Image generation from chat ── */
  async function generateImage(prompt: string) {
    const clean = prompt.replace(IMAGE_TRIGGER, "").replace(/^[:：\s]+/, "").trim() || prompt;
    patchLast((m) => ({ ...m, phases: [{ key: "img", label: "Composing the image", phase: "acting", status: "running" }] }));
    try {
      const j = await fetch("/api/image", {
        method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
        body: JSON.stringify({ prompt: clean, style: "Photoreal" }),
      }).then((r) => r.json());
      patchLast((m) => ({
        ...m,
        phases: [{ key: "img", label: "Image ready", phase: "acting", status: "done" }],
        image: { url: j.url, fallback: j.fallback, prompt: clean, style: j.style },
        content: j.brief || `## ছবি তৈরি হয়েছে\n\n**বিষয়:** ${clean}\n\n### পরবর্তী ধাপ\nছবিটি ডাউনলোড করতে নিচের বোতামে চাপ দিন।`,
      }));
      push("Image generated.", "success");
    } catch {
      patchLast((m) => ({ ...m, content: "ছবি তৈরি করা যায়নি। আবার চেষ্টা করুন।" }));
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const attachments = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    setMessages((m) => [...m, { role: "user", content, attachments }, { role: "assistant", content: "", phases: [] }]);
    setInput(""); setFiles([]); setBusy(true);
    if (areaRef.current) areaRef.current.style.height = "auto";

    if (IMAGE_TRIGGER.test(content)) {
      await generateImage(content);
      setBusy(false);
      return;
    }

    const usePdf = mode === "pdf" && pdfIds.length > 0;
    const useSearch = mode === "search" || model === "Research";

    try {
      if (usePdf) {
        const res = await fetch("/api/pdf/query", {
          method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
          body: JSON.stringify({ query: content, docIds: pdfIds }),
        });
        await consume(res, patchLast);
      } else {
        if (useSearch) {
          patchLast((m) => ({ ...m, phases: [{ key: "s", label: "Searching live sources", phase: "searching", status: "running" }] }));
          try {
            const r = await fetch("/api/research", {
              method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
              body: JSON.stringify({ query: content }),
            }).then((x) => x.json());
            patchLast((m) => ({
              ...m,
              phases: [{ key: "s", label: `${(r.sources ?? []).length} sources found`, phase: "searching", status: "done" }],
              sources: (r.sources ?? []).map((s: { title: string }, i: number) => ({ n: i + 1, filename: s.title, page: 0, score: 1 })),
            }));
          } catch { /* continue */ }
        }
        const res = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json", ...keyHeaders() },
          body: JSON.stringify({
            message: content,
            agentMode: model === "Auto" || model === "Reasoning",
            canvasEnabled: false,
            conversationId,
            attachments,
            taskType: model === "Fast" ? "fast-chat" : model === "Documents" ? "document-generation" : undefined,
          }),
        });
        await consume(res, patchLast, (id) => {
          setConversationId(id);
          if (!conversationId) router.replace(`/chat?c=${id}`);
        });
      }
    } catch {
      patchLast((m) => ({ ...m, content: m.content + "\n\n_Connection interrupted. Please try again._" }));
    } finally { setBusy(false); }
  }

  const empty = messages.length === 0;
  const chips = seeMore ? [...CHIPS, ...MORE_CHIPS] : CHIPS;

  return (
    <div className="relative flex h-screen flex-col">
      {/* ── Top header ── */}
      <header className="absolute right-0 top-0 z-20 flex items-center gap-3 px-5 py-4 lg:px-6">
        {hasKeys && (
          <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="hidden rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[11px] font-medium text-[#15803d] sm:inline">
            Your keys active
          </motion.span>
        )}
        <div className="relative">
          <button onClick={() => setModelOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] text-[#374151] transition-colors hover:bg-[var(--color-hover)]">
            {model} <IconChevron />
          </button>
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                className="cx-glass absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl py-1"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
              >
                {MODELS.map((m) => (
                  <button key={m} onClick={() => { setModel(m); setModelOpen(false); }}
                    className={`block w-full px-3.5 py-2 text-left text-[13.5px] hover:bg-[var(--color-hover)] ${m === model ? "font-medium" : "text-[#374151]"}`}>
                    {m}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button className="cx-btn cx-btn-dark px-4 py-2">Sign In</button>
      </header>

      {/* ── Main ── */}
      <div className="cx-scroll flex flex-1 flex-col overflow-y-auto">
        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-24 pt-20">
            <motion.h1
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }}
              className="cx-display mb-8 text-[24px] font-medium text-[#111827]"
            >
              {mode === "pdf" ? "Ask anything about your PDFs" : mode === "search" ? "What would you like to research?" : "How can I help you?"}
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07, duration: 0.4 }} className="w-full max-w-[800px]">
              <Composer {...{ input, setInput, areaRef, fileRef, send, busy, files, setFiles, onPick, mode }} />
            </motion.div>
            <div className="mt-4 flex max-w-[800px] flex-wrap justify-center gap-2">
              {chips.map((c, i) => (
                <motion.button
                  key={c.label}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.045, duration: 0.3 }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  className="cx-chip" onClick={() => void send(c.prompt)}
                >
                  {c.label}
                </motion.button>
              ))}
              {!seeMore && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + chips.length * 0.045, duration: 0.3 }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  className="cx-chip" onClick={() => setSeeMore(true)}
                >
                  + See More
                </motion.button>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[800px] flex-1 px-5 pb-6 pt-20">
            <div className="space-y-7">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, ease: [0.2, 0.7, 0.3, 1] }}
                  >
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <motion.div
                          initial={{ scale: 0.96 }} animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 380, damping: 26 }}
                          className="max-w-[85%] rounded-2xl rounded-br-md bg-[#f3f4f6] px-4 py-2.5 text-[14.5px] leading-relaxed text-[#111827]"
                        >
                          {m.content}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {m.attachments.map((a) => (
                                <span key={a.name} className="rounded-full bg-white px-2.5 py-0.5 text-[11.5px] text-[#4b5563]">{a.name}</span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      </div>
                    ) : (
                      <div>
                        <AnimatePresence>
                          {m.phases && m.phases.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-3 space-y-1 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5"
                            >
                              {m.phases.map((p) => (
                                <motion.div key={p.key} layout className="flex items-center gap-2 text-[12.5px]">
                                  <span className={p.status === "running" ? "cx-spin inline-block" : ""}>{PHASE_ICON[p.phase] ?? "•"}</span>
                                  <span className={p.status === "done" ? "text-gray-500" : "text-[#111827]"}>{p.label}</span>
                                  {p.status === "done" && <span className="text-[#16a34a]">✓</span>}
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {m.image && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35 }}
                            className="mb-3 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white"
                          >
                            <img
                              src={m.image.url}
                              alt={m.image.prompt}
                              className="w-full"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = m.image!.fallback; }}
                            />
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                              <span className="truncate text-[12px] text-gray-500">{m.image.prompt}</span>
                              <a className="cx-btn px-3 py-1 text-[12px]" href={m.image.url} target="_blank" rel="noreferrer" download>
                                Download
                              </a>
                            </div>
                          </motion.div>
                        )}

                        {m.content ? (
                          <>
                            <Markdown text={m.content} />
                            {m.sources && m.sources.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {m.sources.map((s) => (
                                  <span key={s.n} className="cx-pill">[{s.n}] {s.filename}{s.page ? ` · p.${s.page}` : ""}</span>
                                ))}
                              </div>
                            )}
                            {!busy && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                                className="mt-2.5 flex flex-wrap gap-2">
                                <CopyButton text={m.content} />
                                <button
                                  className="cx-btn px-3 py-1 text-[12px]"
                                  onClick={() => setPreview({
                                    title: m.content.split("\n").find((x) => x.trim())?.replace(/^#+\s*/, "").slice(0, 80) || "VisaMOTion Response",
                                    body: m.content,
                                  })}
                                >
                                  <IconPdf width={13} height={13} /> Preview &amp; export
                                </button>
                                <button className="cx-btn px-3 py-1 text-[12px]"
                                  onClick={() => void send(`ছবি বানাও: ${m.content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 70)}`)}>
                                  <IconImage width={13} height={13} /> Image
                                </button>
                              </motion.div>
                            )}
                          </>
                        ) : (
                          <TypingIndicator />
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          </div>
        )}
      </div>

      {!empty && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] px-5 pb-3 pt-3">
          <div className="mx-auto flex max-w-[800px] flex-col items-center">
            <Composer {...{ input, setInput, areaRef, fileRef, send, busy, files, setFiles, onPick, mode }} />
          </div>
        </div>
      )}

      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro pb-4 pt-2 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}

/* ─────────── Glowing typing indicator ─────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="relative flex h-6 w-6 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-gray-900/10"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-gray-900"
          animate={{ scale: [1, 0.72, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
      <motion.span
        className="ml-1 text-[12.5px] text-gray-400"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 1.7, repeat: Infinity }}
      >
        VisaMOTion is thinking…
      </motion.span>
    </div>
  );
}

/* ─────────── Composer ─────────── */

function Composer({
  input, setInput, areaRef, fileRef, send, busy, files, setFiles, onPick, mode,
}: {
  input: string;
  setInput: (v: string) => void;
  areaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  send: (t?: string) => void | Promise<void>;
  busy: boolean;
  files: { name: string; size: number; type: string; preview?: string }[];
  setFiles: React.Dispatch<React.SetStateAction<{ name: string; size: number; type: string; preview?: string }[]>>;
  onPick: (files: File[]) => void;
  mode: string;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="w-full max-w-[800px]">
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex flex-wrap gap-2 overflow-hidden">
            {files.map((f, i) => (
              <span key={i} className="cx-pill">
                {f.preview ? <img src={f.preview} alt="" className="h-5 w-5 rounded object-cover" /> : null}
                {f.name}
                <button className="ml-1 text-gray-400 hover:text-gray-700" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>✕</button>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        animate={{ borderColor: drag ? "#111827" : "#d1d5db" }}
        transition={{ duration: 0.18 }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onPick(Array.from(e.dataTransfer.files)); }}
        className="flex items-center gap-2 rounded-[24px] border bg-white px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]"
      >
        <input
          ref={fileRef} type="file" multiple className="hidden"
          accept={mode === "pdf" ? "application/pdf,.pdf" : undefined}
          onChange={(e) => { onPick(Array.from(e.target.files ?? [])); e.target.value = ""; }}
        />
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => fileRef.current?.click()}
          className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-[var(--color-hover)] hover:text-gray-900" title="Upload file">
          <IconPlus width={19} height={19} />
        </motion.button>
        <textarea
          ref={areaRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            const el = areaRef.current;
            if (el) { el.style.height = "auto"; el.style.height = `${Math.min(150, el.scrollHeight)}px`; }
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder={drag ? "Drop your PDF here…" : "Type a message..."}
          className="max-h-40 flex-1 resize-none bg-transparent text-[14.5px] leading-6 outline-none placeholder:text-gray-400"
        />
        <motion.button whileTap={{ scale: 0.9 }}
          className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-[var(--color-hover)] hover:text-gray-900" title="Voice input">
          <IconMic width={18} height={18} />
        </motion.button>
        <motion.button
          whileHover={{ scale: busy ? 1 : 1.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          title="Send"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black text-white transition-opacity hover:bg-gray-800 disabled:opacity-30"
        >
          {busy
            ? <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />
            : <IconArrowUp width={16} height={16} />}
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ─────────── SSE consumer ─────────── */

async function consume(
  res: Response,
  patchLast: (fn: (m: Msg) => Msg) => void,
  onConv?: (id: number) => void,
) {
  if (!res.body) throw new Error("no stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5).trim()) as {
        type: string; text?: string; label?: string; key?: string; phase?: string;
        status?: "running" | "done"; conversationId?: number; sources?: Source[];
      };
      if (ev.type === "delta" && ev.text) patchLast((m) => ({ ...m, content: m.content + ev.text }));
      else if (ev.type === "phase") {
        patchLast((m) => {
          const phases = [...(m.phases ?? [])];
          const i = phases.findIndex((p) => p.key === ev.key);
          const next: Phase = { key: ev.key!, label: ev.label!, phase: ev.phase!, status: ev.status! };
          if (i >= 0) phases[i] = next; else phases.push(next);
          return { ...m, phases };
        });
      } else if (ev.type === "sources") patchLast((m) => ({ ...m, sources: ev.sources }));
      else if (ev.type === "done" && ev.conversationId && onConv) onConv(ev.conversationId);
    }
  }
}
