"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Client, DocumentRow } from "@/db/schema";
import { COUNTRIES } from "@/lib/visa-data";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/documents";
import { Badge, CopyButton, Empty, Markdown, PageHeader, Stat } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });
import { useToast } from "@/components/Toast";
import { IconDoc, IconPdf, IconSearch, IconTrash } from "@/components/icons";

export default function DocumentsPage() {
  const { push } = useToast();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | "">("");
  const [country, setCountry] = useState(COUNTRIES[0].country);
  const [visaType, setVisaType] = useState(COUNTRIES[0].visaTypes[0]);
  const [kind, setKind] = useState<DocumentKind>("cover-letter");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<DocumentRow | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [query, setQuery] = useState("");

  const rule = useMemo(() => COUNTRIES.find((c) => c.country === country)!, [country]);
  const kindMeta = DOCUMENT_KINDS.find((d) => d.key === kind)!;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? docs.filter((d) => d.title.toLowerCase().includes(q) || d.kind.includes(q)) : docs;
  }, [docs, query]);

  const load = async () => {
    const [d, c] = await Promise.all([
      fetch("/api/documents").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    setDocs(d.documents ?? []);
    setClients(c.clients ?? []);
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("client");
    if (preset) setClientId(Number(preset));
    else if ((c.clients ?? []).length) setClientId((p: number | "") => (p === "" ? c.clients[0].id : p));
    const pc = params.get("country");
    if (pc && COUNTRIES.some((x) => x.country === pc)) setCountry(pc);
    const pv = params.get("visa");
    if (pv) setVisaType(pv);
  };
  useEffect(() => { void load(); }, []);

  async function generate() {
    if (!clientId) return;
    setBusy(true);
    const j = await fetch("/api/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, clientId, country, visaType }),
    }).then((r) => r.json());
    setBusy(false);
    if (j.document) {
      setActive(j.document);
      setPreview({ title: j.document.title, body: j.document.body, docId: j.document.id });
      push("Document generated — preview open.", "success");
    }
    void load();
  }

  async function remove(id: number) {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (active?.id === id) setActive(null);
    push("Document deleted.", "success");
    void load();
  }

  const openPreview = (d: DocumentRow) => setPreview({ title: d.title, body: d.body, docId: d.id });

  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Document studio"
        subtitle="Generate, preview and export professional documents as PDF, DOCX, DOC or A4 print"
        actions={<Badge tone="blue">{docs.length} generated</Badge>}
      />

      <div className="cx-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Templates" value={DOCUMENT_KINDS.length} hint="PDF · DOCX · DOC · A4" />
            <Stat label="Documents on file" value={docs.length} />
            <Stat label="Countries covered" value={COUNTRIES.length} />
          </div>

          {/* Generator */}
          <div className="cx-card p-5">
            <div className="mb-3 text-[14px] font-semibold">Generate a document</div>
            <div className="grid gap-3 sm:grid-cols-5">
              <select className="cx-input" value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
                <option value="">Client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
              <select className="cx-input" value={country} onChange={(e) => {
                setCountry(e.target.value);
                const r = COUNTRIES.find((x) => x.country === e.target.value)!;
                setVisaType(r.visaTypes[0]);
              }}>
                {COUNTRIES.map((c) => <option key={c.country} value={c.country}>{c.flag} {c.countryBn}</option>)}
              </select>
              <select className="cx-input" value={visaType} onChange={(e) => setVisaType(e.target.value)}>
                {rule.visaTypes.map((v, i) => <option key={v} value={v}>{rule.visaTypesBn[i]}</option>)}
              </select>
              <select className="cx-input" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
                {DOCUMENT_KINDS.map((d) => <option key={d.key} value={d.key}>{d.labelBn}</option>)}
              </select>
              <motion.button whileTap={{ scale: 0.97 }} className="cx-btn cx-btn-dark" disabled={busy || !clientId} onClick={() => void generate()}>
                {busy ? <span className="cx-spin h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" /> : "Generate"}
              </motion.button>
            </div>
            <div className="mt-3 text-[12px] text-gray-500">
              {kindMeta.note} · {kindMeta.lang === "bn" ? "Bangla documents export best as DOCX or DOC" : "Use PDF for embassy submission"}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
            {/* Library */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3.5 py-2">
                <IconSearch width={15} height={15} className="shrink-0 text-gray-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…"
                  className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400" />
                {query && <button className="text-[12px] text-gray-400 hover:text-gray-800" onClick={() => setQuery("")}>Clear</button>}
              </div>

              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <Empty>{query ? `No document matches “${query}”.` : "No documents yet — generate one above."}</Empty>
                ) : filtered.map((d, i) => (
                  <motion.div
                    key={d.id} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.025, duration: 0.24 }}
                    whileHover={{ y: -2 }}
                    onClick={() => { setActive(d); openPreview(d); }}
                    className={`cx-card group cursor-pointer p-4 transition-shadow hover:shadow-[0_8px_22px_rgba(17,24,39,.08)] ${active?.id === d.id ? "border-gray-900" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-[13px] font-medium">{d.title}</span>
                      <Badge tone={d.format === "docx" ? "purple" : "neutral"}>{d.format.toUpperCase()}</Badge>
                    </div>
                    <div className="mt-1 text-[11.5px] text-gray-500">
                      {DOCUMENT_KINDS.find((k) => k.key === d.kind)?.labelBn ?? d.kind} · {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="cx-pill">Open preview →</span>
                      <button className="ml-auto text-gray-400 hover:text-[#b91c1c]"
                        onClick={(e) => { e.stopPropagation(); void remove(d.id); }} aria-label="Delete">
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Inline reader */}
            <div className="cx-card min-h-[420px] p-6">
              {active ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] pb-3">
                    <div className="text-[14.5px] font-semibold">{active.title}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <motion.button whileTap={{ scale: 0.97 }} className="cx-btn cx-btn-dark px-3 py-1 text-[12px]" onClick={() => openPreview(active)}>
                        Preview &amp; export
                      </motion.button>
                      <a className="cx-btn px-3 py-1 text-[12px]" href={`/api/documents/${active.id}?format=pdf`}><IconPdf width={13} height={13} /> PDF</a>
                      <a className="cx-btn px-3 py-1 text-[12px]" href={`/api/documents/${active.id}?format=docx`}><IconDoc width={13} height={13} /> DOCX</a>
                      <CopyButton text={active.body} />
                    </div>
                  </div>
                  <Markdown text={active.body} />
                </>
              ) : (
                <div className="grid h-full place-items-center text-center text-[13.5px] text-gray-500">
                  Select a document to read it here, or click any card to open the A4 preview.
                </div>
              )}
            </div>
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
