"use client";

import { useEffect, useMemo, useState } from "react";
import type { Application, Client } from "@/db/schema";
import { COUNTRIES, visaTypeBn } from "@/lib/visa-data";
import { Badge, Empty, PageHeader, Progress, Stat } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface Row { application: Application; client: Client | null }

const STATUSES: { key: string; bn: string }[] = [
  { key: "intake", bn: "প্রাথমিক" },
  { key: "documents", bn: "ডকুমেন্ট সংগ্রহ" },
  { key: "assessment", bn: "যাচাই চলছে" },
  { key: "lodged", bn: "জমা দেওয়া" },
  { key: "biometrics", bn: "বায়োমেট্রিক" },
  { key: "approved", bn: "অনুমোদিত" },
  { key: "refused", bn: "প্রত্যাখ্যাত" },
];
const statusBn = (k: string) => STATUSES.find((s) => s.key === k)?.bn ?? k;

export default function ApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | "">("");
  const [country, setCountry] = useState(COUNTRIES[0].country);
  const [visaType, setVisaType] = useState(COUNTRIES[0].visaTypes[0]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  function buildReport(a: Application, clientName: string) {
    const c = COUNTRIES.find((x) => x.country === a.country);
    return {
      title: `Assessment report — ${clientName} (${c?.countryBn ?? a.country})`,
      body: [
        `# ${c?.countryBn ?? a.country} — ${visaTypeBn(a.country, a.visaType)}`,
        ``,
        `আবেদনকারী: ${clientName}${a.trackingId ? ` · ট্র্যাকিং ${a.trackingId}` : ""}`,
        ``,
        `## ফলাফল সারসংক্ষেপ`,
        `| বিষয় | ফলাফল |`,
        `| --- | --- |`,
        `| যোগ্যতা স্কোর | ${a.eligibilityScore} / ১০০ |`,
        `| ঝুঁকি স্কোর | ${a.riskScore} |`,
        `| সফলতার সম্ভাবনা | ${a.successProbability}% (আনুমানিক) |`,
        `| আনুমানিক ফি | ${Math.round(a.feeAmount).toLocaleString("bn-BD")} ${a.feeCurrency} |`,
        `| প্রসেসিং সময় | ${a.processingEstimate} |`,
        `| বর্তমান অবস্থা | ${statusBn(a.status)} |`,
        ``,
        `## রেড ফ্ল্যাগ`,
        ...(a.redFlags.length ? a.redFlags.map((f) => `- ${f}`) : ["- উল্লেখযোগ্য কোনো ঝুঁকি পাওয়া যায়নি।"]),
        ``,
        `## পরামর্শ`,
        ...a.recommendations.map((r) => `- ${r}`),
        ``,
        `## ডকুমেন্ট চেকলিস্ট`,
        ...a.checklist.map((x, i) => `${i + 1}. ${x.done ? "✓" : "☐"} ${x.item}`),
        ``,
        `> ফি ও সময় আনুমানিক; চূড়ান্ত সিদ্ধান্ত দূতাবাসের উপর নির্ভরশীল।`,
      ].join("\n"),
    };
  }

  const rule = useMemo(() => COUNTRIES.find((c) => c.country === country)!, [country]);

  const load = async () => {
    const [a, c] = await Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    setRows(a.applications ?? []);
    setClients(c.clients ?? []);
    const preset = new URLSearchParams(window.location.search).get("client");
    if (preset) setClientId(Number(preset));
    else if ((c.clients ?? []).length) setClientId((p: number | "") => (p === "" ? c.clients[0].id : p));
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { setVisaType(rule.visaTypes[0]); }, [rule]);

  async function create() {
    if (!clientId) return;
    setBusy(true);
    await fetch("/api/applications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, country, visaType }),
    });
    setBusy(false);
    void load();
  }

  async function patch(payload: Record<string, unknown>) {
    await fetch("/api/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    void load();
  }

  const approved = rows.filter((r) => r.application.status === "approved").length;
  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + r.application.eligibilityScore, 0) / rows.length) : 0;
  const pipeline = rows.reduce((s, r) => s + r.application.feeAmount, 0);

  return (
    <div>
      <PageHeader title="আবেদন" subtitle="যোগ্যতা স্কোর, ঝুঁকি বিশ্লেষণ ও ডকুমেন্ট চেকলিস্ট" />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="চলমান ফাইল" value={rows.length.toLocaleString("bn-BD")} />
          <Stat label="অনুমোদিত" value={approved.toLocaleString("bn-BD")} />
          <Stat label="গড় যোগ্যতা" value={`${avgScore.toLocaleString("bn-BD")}/১০০`} />
          <Stat label="পাইপলাইন মূল্য" value={Math.round(pipeline).toLocaleString("bn-BD")} hint="মিশ্র মুদ্রা" />
        </div>

        <div className="cx-card p-5">
          <div className="mb-3 text-[14px] font-semibold">নতুন যোগ্যতা যাচাই</div>
          <div className="grid gap-3 sm:grid-cols-4">
            <select className="cx-input" value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
              <option value="">ক্লায়েন্ট নির্বাচন করুন…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
            <select className="cx-input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.country} value={c.country}>{c.flag} {c.countryBn}</option>)}
            </select>
            <select className="cx-input" value={visaType} onChange={(e) => setVisaType(e.target.value)}>
              {rule.visaTypes.map((v, i) => <option key={v} value={v}>{rule.visaTypesBn[i]}</option>)}
            </select>
            <button className="cx-btn cx-btn-dark" disabled={busy || !clientId} onClick={() => void create()}>
              {busy ? "হিসাব হচ্ছে…" : "স্কোর হিসাব করুন"}
            </button>
          </div>
          <div className="mt-3 text-[12px] text-[var(--color-muted)]">
            {rule.flag} {rule.highlightBn} · ন্যূনতম তহবিল {rule.minimumBankBalance.toLocaleString("bn-BD")} ডলার · বিশেষ শর্ত: {rule.extraDocumentsBn.join(", ")}
          </div>
        </div>

        {rows.length === 0 ? <Empty>এখনও কোনো আবেদন নেই।</Empty> : (
          <div className="space-y-3">
            {rows.map(({ application: a, client }) => {
              const cRule = COUNTRIES.find((c) => c.country === a.country);
              const done = a.checklist.filter((c) => c.done).length;
              const isOpen = expanded === a.id;
              return (
                <div key={a.id} className="cx-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px]">{cRule?.flag ?? "🌍"}</span>
                        <span className="text-[15px] font-semibold tracking-tight">
                          {cRule?.countryBn ?? a.country} · {visaTypeBn(a.country, a.visaType)}
                        </span>
                        <Badge tone={a.status === "approved" ? "green" : a.status === "refused" ? "red" : a.status === "lodged" ? "blue" : "neutral"}>
                          {statusBn(a.status)}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                        {client?.fullName ?? "অজানা ক্লায়েন্ট"}{a.trackingId && ` · ট্র্যাকিং ${a.trackingId}`} · {a.processingEstimate} · {Math.round(a.feeAmount).toLocaleString("bn-BD")} {a.feeCurrency}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="cx-input w-auto py-1.5 text-[12.5px]" value={a.status} onChange={(e) => void patch({ id: a.id, status: e.target.value })}>
                        {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.bn}</option>)}
                      </select>
                      <button className="cx-btn px-3 py-1.5 text-[12.5px]" onClick={() => setPreview(buildReport(a, client?.fullName ?? "—"))}>
                        রিপোর্ট প্রিভিউ
                      </button>
                      <button className="cx-btn px-3 py-1.5 text-[12.5px]" onClick={() => setExpanded(isOpen ? null : a.id)}>
                        {isOpen ? "গুটিয়ে নিন" : "বিস্তারিত"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "যোগ্যতা", value: a.eligibilityScore, tone: a.eligibilityScore > 70 ? "#16a34a" : a.eligibilityScore > 45 ? "#d97706" : "#dc2626" },
                      { label: "ঝুঁকি", value: a.riskScore, tone: a.riskScore > 50 ? "#dc2626" : a.riskScore > 25 ? "#d97706" : "#16a34a" },
                      { label: "সফলতার সম্ভাবনা", value: a.successProbability, tone: "#111827" },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="mb-1 flex justify-between text-[12px] text-[var(--color-muted)]">
                          <span>{m.label}</span><span className="font-medium text-[var(--color-ink)]">{m.value.toLocaleString("bn-BD")}%</span>
                        </div>
                        <Progress value={m.value} tone={m.tone} />
                      </div>
                    ))}
                  </div>

                  {isOpen && (
                    <div className="cx-fade mt-4 grid gap-5 border-t border-[var(--color-line)] pt-4 lg:grid-cols-3">
                      <div>
                        <div className="mb-2 text-[12.5px] font-semibold text-[var(--color-muted)]">রেড ফ্ল্যাগ</div>
                        {a.redFlags.length === 0
                          ? <p className="text-[13px] text-[#137333]">উল্লেখযোগ্য কোনো ঝুঁকি নেই।</p>
                          : <ul className="space-y-1 text-[13px]">{a.redFlags.map((f) => <li key={f} className="text-[#c5221f]">• {f}</li>)}</ul>}
                        <div className="mb-2 mt-4 text-[12.5px] font-semibold text-[var(--color-muted)]">পরামর্শ</div>
                        <ul className="space-y-1 text-[13px]">{a.recommendations.map((f) => <li key={f}>• {f}</li>)}</ul>
                      </div>
                      <div className="lg:col-span-2">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-[var(--color-muted)]">
                            ডকুমেন্ট চেকলিস্ট ({done.toLocaleString("bn-BD")}/{a.checklist.length.toLocaleString("bn-BD")})
                          </span>
                          <a className="cx-btn px-3 py-1 text-[12px]" href={`/documents?client=${a.clientId}&country=${encodeURIComponent(a.country)}&visa=${encodeURIComponent(a.visaType)}`}>
                            ডকুমেন্ট প্যাক তৈরি করুন
                          </a>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {a.checklist.map((item, i) => (
                            <button key={item.item} onClick={() => void patch({ id: a.id, checklistIndex: i })}
                              className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[13px] hover:bg-[var(--color-soft)]">
                              <span className={`mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${item.done ? "border-[#137333] bg-[#137333] text-white" : "border-[#dadce0]"}`}>
                                {item.done ? "✓" : ""}
                              </span>
                              <span className={item.done ? "text-[var(--color-muted)] line-through" : ""}>{item.item}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}