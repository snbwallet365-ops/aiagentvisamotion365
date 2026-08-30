"use client";

import { useEffect, useState } from "react";
import type { Client } from "@/db/schema";
import { Badge, Empty, PageHeader, Progress, Stat } from "@/components/ui";
import { Markdown } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

const EMPTY = {
  fullName: "", email: "", phone: "", nationality: "Bangladesh", passportNo: "",
  passportValidityMonths: 24, age: 28, education: "", jobTitle: "", employerName: "",
  salary: 0, bankBalance: 0, jobOffer: false, travelHistory: false, previousRejections: 0,
  languageProficiency: "", preferredLanguage: "bn", notes: "",
};

export default function ClientsPage() {
  const [rows, setRows] = useState<Client[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interview, setInterview] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  function dossier(c: Client): PreviewDoc {
    return {
      title: `Client dossier — ${c.fullName}`,
      body: [
        `# ${c.fullName}`,
        ``,
        `## ব্যক্তিগত তথ্য`,
        `| বিষয় | তথ্য |`,
        `| --- | --- |`,
        `| ইমেইল | ${c.email} |`,
        `| ফোন | ${c.phone || "—"} |`,
        `| পাসপোর্ট | ${c.passportNo || "—"} |`,
        `| জাতীয়তা | ${c.nationality} |`,
        `| বয়স | ${c.age} |`,
        `| পাসপোর্টের মেয়াদ | ${c.passportValidityMonths} মাস |`,
        ``,
        `## পেশা ও আর্থিক অবস্থা`,
        `| বিষয় | তথ্য |`,
        `| --- | --- |`,
        `| পদবি | ${c.jobTitle || "—"} |`,
        `| নিয়োগকর্তা | ${c.employerName || "—"} |`,
        `| মাসিক বেতন | ${c.salary.toLocaleString("bn-BD")} ডলার |`,
        `| ব্যাংক ব্যালেন্স | ${c.bankBalance.toLocaleString("bn-BD")} ডলার |`,
        `| জব অফার | ${c.jobOffer ? "আছে" : "নেই"} |`,
        ``,
        `## কমপ্লায়েন্স`,
        `- শিক্ষাগত যোগ্যতা: ${c.education || "—"}`,
        `- ভাষা পরীক্ষা: ${c.languageProficiency || "—"}`,
        `- আন্তর্জাতিক ভ্রমণ: ${c.travelHistory ? "আছে" : "নেই"}`,
        `- পূর্বের রিফিউজাল: ${c.previousRejections}`,
        ``,
        `## পরামর্শকের নোট`,
        c.notes || "—",
      ].join("\n"),
    };
  }

  const load = async () => {
    const j = await fetch("/api/clients").then((r) => r.json());
    setRows(j.clients ?? []);
  };
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!form.fullName || !form.email) return;
    setSaving(true);
    await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...EMPTY });
    setOpen(false);
    setSaving(false);
    void load();
  }

  async function runIntake(c: Client) {
    setInterview({ name: c.fullName, text: "" });
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskType: "visa-interview",
        message: `${c.fullName} নামের আবেদনকারীর ইনটেক ইন্টারভিউ চালাও। তথ্য: বয়স ${c.age}, জাতীয়তা ${c.nationality}, পদ ${c.jobTitle || "নেই"}, নিয়োগকর্তা ${c.employerName || "নেই"}, মাসিক বেতন ${c.salary} ডলার, ব্যাংক ব্যালেন্স ${c.bankBalance} ডলার, পাসপোর্টের মেয়াদ ${c.passportValidityMonths} মাস, পূর্বের রিফিউজাল ${c.previousRejections} বার, ভাষা ${c.languageProficiency || "নেই"}। সবচেয়ে জরুরি ৫টি অনুপস্থিত প্রশ্ন করো এবং ঝুঁকিগুলো চিহ্নিত করো।`,
      }),
    });
    const reader = res.body?.getReader();
    if (!reader) return;
    const dec = new TextDecoder();
    let buf = "", acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
      for (const p of parts) {
        if (!p.trim().startsWith("data:")) continue;
        const ev = JSON.parse(p.trim().slice(5)) as { type?: string; text?: string };
        if (ev.type === "delta" && ev.text) { acc += ev.text; setInterview({ name: c.fullName, text: acc }); }
      }
    }
  }

  const avgFunds = rows.length ? Math.round(rows.reduce((s, r) => s + r.bankBalance, 0) / rows.length) : 0;
  const sponsored = rows.filter((r) => r.jobOffer).length;

  const TEXT_FIELDS: [keyof typeof EMPTY, string][] = [
    ["fullName", "পূর্ণ নাম"], ["email", "ইমেইল"], ["phone", "ফোন"],
    ["passportNo", "পাসপোর্ট নম্বর"], ["education", "শিক্ষাগত যোগ্যতা"], ["jobTitle", "পদবি"],
    ["employerName", "নিয়োগকর্তা"], ["languageProficiency", "ভাষা পরীক্ষার স্কোর"],
  ];
  const NUM_FIELDS: [keyof typeof EMPTY, string][] = [
    ["age", "বয়স"], ["passportValidityMonths", "পাসপোর্টের মেয়াদ (মাস)"],
    ["salary", "মাসিক বেতন (ডলার)"], ["bankBalance", "ব্যাংক ব্যালেন্স (ডলার)"],
    ["previousRejections", "পূর্বের রিফিউজাল"],
  ];

  return (
    <div>
      <PageHeader
        title="ক্লায়েন্ট"
        subtitle="আবেদনকারীর প্রোফাইল ও এআই ইনটেক ইন্টারভিউ"
        actions={
          <>
            <a className="cx-btn px-3 py-1.5 text-[12.5px]" href="/api/export">⬇ CSV এক্সপোর্ট</a>
            <button className="cx-btn cx-btn-dark" onClick={() => setOpen((v) => !v)}>{open ? "বন্ধ করুন" : "＋ নতুন ক্লায়েন্ট"}</button>
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="মোট ক্লায়েন্ট" value={rows.length.toLocaleString("bn-BD")} />
          <Stat label="জব অফার আছে" value={sponsored.toLocaleString("bn-BD")} hint="স্পন্সরনির্ভর রুট" />
          <Stat label="গড় তহবিল" value={`${avgFunds.toLocaleString("bn-BD")} ডলার`} />
        </div>

        {open && (
          <div className="cx-card cx-fade p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {TEXT_FIELDS.map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-[12px] text-[var(--color-muted)]">{label}</span>
                  <input className="cx-input" value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </label>
              ))}
              {NUM_FIELDS.map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-[12px] text-[var(--color-muted)]">{label}</span>
                  <input type="number" className="cx-input" value={Number(form[k])} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-[13.5px]">
                <input type="checkbox" checked={form.jobOffer} onChange={(e) => setForm({ ...form, jobOffer: e.target.checked })} /> যাচাইকৃত জব অফার আছে
              </label>
              <label className="flex items-center gap-2 text-[13.5px]">
                <input type="checkbox" checked={form.travelHistory} onChange={(e) => setForm({ ...form, travelHistory: e.target.checked })} /> আন্তর্জাতিক ভ্রমণের অভিজ্ঞতা আছে
              </label>
            </div>
            <textarea className="cx-input mt-3" rows={2} placeholder="পরামর্শকের নোট" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="mt-3 flex justify-end gap-2">
              <button className="cx-btn" onClick={() => setOpen(false)}>বাতিল</button>
              <button className="cx-btn cx-btn-dark" disabled={saving} onClick={() => void save()}>{saving ? "সংরক্ষণ হচ্ছে…" : "ক্লায়েন্ট যোগ করুন"}</button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <Empty>এখনও কোনো ক্লায়েন্ট যোগ করা হয়নি।</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((c) => {
              const strength = Math.min(100, Math.round((c.bankBalance / 15000) * 40 + (c.jobOffer ? 30 : 0) + (c.travelHistory ? 15 : 0) + (c.passportValidityMonths >= 12 ? 15 : 5)));
              return (
                <div key={c.id} className="cx-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-semibold tracking-tight">{c.fullName}</div>
                      <div className="text-[12.5px] text-[var(--color-muted)]">{c.jobTitle || "পদ উল্লেখ নেই"}{c.employerName && ` · ${c.employerName}`}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge tone={c.jobOffer ? "green" : "amber"}>{c.jobOffer ? "স্পন্সরড" : "অফার নেই"}</Badge>
                      <Badge tone={c.previousRejections > 0 ? "red" : "neutral"}>{c.previousRejections.toLocaleString("bn-BD")} রিফিউজাল</Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] text-[#374151] sm:grid-cols-3">
                    <div>📧 {c.email}</div>
                    <div>📱 {c.phone || "—"}</div>
                    <div>🛂 {c.passportNo || "—"}</div>
                    <div>💰 {c.bankBalance.toLocaleString("bn-BD")} ডলার</div>
                    <div>💵 {c.salary.toLocaleString("bn-BD")} ডলার/মাস</div>
                    <div>🗓 {c.passportValidityMonths.toLocaleString("bn-BD")} মাস মেয়াদ</div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11.5px] text-[var(--color-muted)]">
                      <span>প্রোফাইলের শক্তি</span><span>{strength.toLocaleString("bn-BD")}%</span>
                    </div>
                    <Progress value={strength} tone={strength > 70 ? "#16a34a" : strength > 45 ? "#d97706" : "#dc2626"} />
                  </div>
                  {c.notes && <p className="mt-3 text-[12.5px] text-[var(--color-muted)]">{c.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="cx-btn px-3 py-1 text-[12.5px]" onClick={() => void runIntake(c)}>🎙️ এআই ইন্টারভিউ</button>
                    <a className="cx-btn px-3 py-1 text-[12.5px]" href={`/applications?client=${c.id}`}>📊 যোগ্যতা যাচাই</a>
                    <a className="cx-btn px-3 py-1 text-[12.5px]" href={`/documents?client=${c.id}`}>📄 ডকুমেন্ট তৈরি</a>
                    <button className="cx-btn px-3 py-1 text-[12.5px]" onClick={() => setPreview(dossier(c))}>🗂️ ডসিয়ার প্রিভিউ</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {interview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4" onClick={() => setInterview(null)}>
          <div className="cx-card cx-scroll max-h-[82vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[15.5px] font-semibold">ইনটেক ইন্টারভিউ · {interview.name}</div>
              <button className="cx-btn px-3 py-1" onClick={() => setInterview(null)}>✕</button>
            </div>
            {interview.text ? <Markdown text={interview.text} /> : (
              <div className="space-y-2">
                <div className="cx-shimmer h-3 w-2/3 rounded-full" />
                <div className="cx-shimmer h-3 w-1/2 rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}
      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}