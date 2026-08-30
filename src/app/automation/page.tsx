"use client";

import { useEffect, useState } from "react";
import type { ScheduledTask, WorkflowRun } from "@/db/schema";
import type { WorkflowDef } from "@/lib/workflows";
import { COUNTRIES } from "@/lib/visa-data";
import { Badge, Empty, PageHeader, Stat } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface MatrixRow { feature: string; agentBrowser: string; playwright: string }

const TASK_BN: Record<string, string> = {
  "Daily visa news + policy digest": "দৈনিক ভিসা সংবাদ ও নীতি সারাংশ",
  "Document deadline reminders": "ডকুমেন্ট ডেডলাইন রিমাইন্ডার",
  "Client follow-up sequence": "ক্লায়েন্ট ফলো-আপ সিকোয়েন্স",
  "Embassy status sweep (agent-browser)": "এম্বাসি স্ট্যাটাস সুইপ (অটোমেশন)",
  "Weekly business summary": "সাপ্তাহিক ব্যবসায়িক সারসংক্ষেপ",
  "Monthly performance report": "মাসিক পারফরম্যান্স রিপোর্ট",
  "Social media auto-publish": "সোশ্যাল মিডিয়া স্বয়ংক্রিয় প্রকাশ",
};
const CHANNEL_BN: Record<string, string> = {
  whatsapp: "হোয়াটসঅ্যাপ", email: "ইমেইল", automation: "অটোমেশন", social: "সোশ্যাল", voice: "ভয়েস",
};

export default function AutomationPage() {
  const [defs, setDefs] = useState<WorkflowDef[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [country, setCountry] = useState(COUNTRIES[0].country);
  const [engine, setEngine] = useState("auto");
  const [running, setRunning] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [tab, setTab] = useState<"workflows" | "scheduler" | "matrix">("workflows");

  const load = async () => {
    const [w, t] = await Promise.all([
      fetch("/api/workflows").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ]);
    setDefs(w.workflows ?? []); setRuns(w.runs ?? []); setMatrix(w.matrix ?? []); setTasks(t.tasks ?? []);
  };
  useEffect(() => { void load(); }, []);

  async function run(key: string) {
    setRunning(key);
    const j = await fetch("/api/workflows", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, country, engine: engine === "auto" ? undefined : engine }),
    }).then((r) => r.json());
    setRunning(null);
    await load();
    if (j.run) setOpenRun(j.run.id);
  }

  async function runTask(id: number, toggle = false) {
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, toggle }) });
    void load();
  }

  const success = runs.filter((r) => r.status === "success").length;
  const tokens = runs.reduce((s, r) => s + r.tokensUsed, 0);
  const bnCountry = COUNTRIES.find((c) => c.country === country)?.countryBn ?? country;

  return (
    <div>
      <PageHeader
        title="অটোমেশন"
        subtitle="এম্বাসি পোর্টাল অটোমেশন, রিট্রাই লজিক ও দৈনিক শিডিউলার"
        actions={
          <>
            <select className="cx-input w-auto py-1.5 text-[12.5px]" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.country} value={c.country}>{c.flag} {c.countryBn}</option>)}
            </select>
            <select className="cx-input w-auto py-1.5 text-[12.5px]" value={engine} onChange={(e) => setEngine(e.target.value)}>
              <option value="auto">ইঞ্জিন: স্বয়ংক্রিয়</option>
              <option value="agent-browser">স্ন্যাপশট ইঞ্জিন</option>
              <option value="playwright-cli">শ্যাডো-ডম ইঞ্জিন</option>
            </select>
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="ওয়ার্কফ্লো" value={defs.length.toLocaleString("bn-BD")} hint="৫টি জটিল প্রবাহ" />
          <Stat label="মোট রান" value={runs.length.toLocaleString("bn-BD")} />
          <Stat label="সফলতার হার" value={runs.length ? `${Math.round((success / runs.length) * 100).toLocaleString("bn-BD")}%` : "—"} />
          <Stat label="স্ন্যাপশট টোকেন" value={tokens.toLocaleString("bn-BD")} hint="ডম ডাম্পের চেয়ে ৯৩% কম" />
        </div>

        <div className="flex flex-wrap gap-2">
          {([["workflows", "ওয়ার্কফ্লো"], ["scheduler", "শিডিউলার"], ["matrix", "ইঞ্জিন তুলনা"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`cx-btn ${tab === k ? "cx-btn-dark" : "cx-btn"}`}>{label}</button>
          ))}
        </div>

        {tab === "workflows" && (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {defs.map((w) => (
                <div key={w.key} className="cx-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[14.5px] font-semibold tracking-tight">{w.nameBn}</div>
                      <div className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">{w.descriptionBn}</div>
                    </div>
                    <Badge tone={w.engine === "agent-browser" ? "blue" : "purple"}>
                      {w.engine === "agent-browser" ? "স্ন্যাপশট" : "শ্যাডো-ডম"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {w.steps.slice(0, 4).map((s, i) => (
                      <div key={s.step} className="text-[12px]">
                        <span className="mr-1.5 text-[var(--color-muted)]">{(i + 1).toLocaleString("bn-BD")}.</span>
                        <span className="font-medium">{s.stepBn}</span>
                      </div>
                    ))}
                    <div className="text-[11.5px] text-[var(--color-muted)]">
                      + আরও {(w.steps.length - 4).toLocaleString("bn-BD")}টি ধাপ · ব্যর্থ হলে ৩ বার রিট্রাই (এক্সপোনেনশিয়াল ব্যাকঅফ)
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="cx-pill">{w.tokensPerSnapshot.toLocaleString("bn-BD")} টোকেন/স্ন্যাপশট</span>
                    <button className="cx-btn cx-btn-dark px-4 py-1.5 text-[12.5px]" disabled={running === w.key} onClick={() => void run(w.key)}>
                      {running === w.key ? "চলছে…" : `${bnCountry}-এর জন্য চালান`}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cx-card overflow-hidden">
              <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">রান হিস্ট্রি</div>
              {runs.length === 0 ? <div className="px-5 py-8 text-center text-[13.5px] text-[var(--color-muted)]">এখনও কোনো রান নেই।</div> : (
                <div className="divide-y divide-[var(--color-line)]">
                  {runs.map((r) => {
                    const def = defs.find((d) => d.key === r.workflowKey);
                    const cBn = COUNTRIES.find((c) => c.country === r.country)?.countryBn ?? r.country;
                    return (
                      <div key={r.id} className="px-5 py-3">
                        <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpenRun(openRun === r.id ? null : r.id)}>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={r.status === "success" ? "green" : "red"}>{r.status === "success" ? "সফল" : "ব্যর্থ"}</Badge>
                              <span className="truncate text-[13.5px] font-medium">{def?.nameBn ?? r.workflowKey}</span>
                              <span className="text-[12px] text-[var(--color-muted)]">{cBn}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">{r.result}</div>
                          </div>
                          <div className="shrink-0 text-right text-[11.5px] text-[var(--color-muted)]">
                            <div>{r.attempts.toLocaleString("bn-BD")} প্রচেষ্টা</div>
                            <div>{(r.durationMs / 1000).toFixed(1)} সেকেন্ড</div>
                          </div>
                        </button>
                        {openRun === r.id && (
                          <div className="cx-fade mt-3 space-y-1.5 rounded-2xl bg-[var(--color-soft)] p-4">
                            <button
                              className="cx-btn mb-1 px-3 py-1 text-[11.5px]"
                              onClick={() => setPreview({
                                title: `${def?.nameBn ?? r.workflowKey} — ${cBn}`,
                                body: [
                                  `# ${def?.nameBn ?? r.workflowKey}`,
                                  ``,
                                  `| বিষয় | তথ্য |`,
                                  `| --- | --- |`,
                                  `| দেশ | ${cBn} |`,
                                  `| ইঞ্জিন | ${r.engine} |`,
                                  `| অবস্থা | ${r.status === "success" ? "সফল" : "ব্যর্থ"} |`,
                                  `| প্রচেষ্টা | ${r.attempts} |`,
                                  `| সময় | ${(r.durationMs / 1000).toFixed(1)} সেকেন্ড |`,
                                  `| টোকেন | ${r.tokensUsed} |`,
                                  ``,
                                  `## ধাপসমূহ`,
                                  ...r.steps.map((st, n) => `${n + 1}. ${st.status === "ok" ? "✓" : "↻"} ${st.step} — প্রচেষ্টা ${st.attempt} · ${st.note}`),
                                  ``,
                                  `## ফলাফল`,
                                  r.result,
                                ].join("\n"),
                              })}
                            >
                              রান রিপোর্ট প্রিভিউ
                            </button>
                            {r.steps.map((s, i) => (
                              <div key={i} className="flex items-start gap-2 text-[12px]">
                                <span className={s.status === "ok" ? "text-[#137333]" : "text-[#f9ab00]"}>{s.status === "ok" ? "✓" : "↻"}</span>
                                <div className="min-w-0">
                                  <span className="font-medium">{s.step}</span>
                                  <span className="text-[var(--color-muted)]"> · প্রচেষ্টা {s.attempt.toLocaleString("bn-BD")} · {s.note}</span>
                                  <div className="truncate"><code className="text-[10.5px] text-[#6b7280]">{s.command}</code></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "scheduler" && (
          <div className="space-y-2">
            {tasks.length === 0 ? <Empty>কোনো শিডিউল করা কাজ নেই।</Empty> : tasks.map((t) => (
              <div key={t.id} className="cx-card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium">{TASK_BN[t.name] ?? t.name}</span>
                    <Badge tone={t.enabled ? "green" : "neutral"}>{t.enabled ? "সক্রিয়" : "বন্ধ"}</Badge>
                    <span className="cx-pill">{CHANNEL_BN[t.channel] ?? t.channel}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--color-muted)]">
                    <code>{t.cron}</code> · মোট রান {t.runCount.toLocaleString("bn-BD")} · {t.lastRunAt ? `সর্বশেষ ${new Date(t.lastRunAt).toLocaleString("bn-BD")}` : "এখনও চালানো হয়নি"}
                  </div>
                  {t.lastResult && <div className="mt-1 text-[12.5px] text-[#374151]">↳ {t.lastResult}</div>}
                </div>
                <div className="flex gap-2">
                  <button className="cx-btn px-3 py-1.5 text-[12.5px]" onClick={() => void runTask(t.id, true)}>{t.enabled ? "বন্ধ করুন" : "সক্রিয় করুন"}</button>
                  <button className="cx-btn cx-btn-dark px-3 py-1.5 text-[12.5px]" onClick={() => void runTask(t.id)}>এখনই চালান</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "matrix" && (
          <div className="cx-card overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--color-soft)] text-left text-[12px] text-[var(--color-muted)]">
                <tr>
                  <th className="px-5 py-3">বৈশিষ্ট্য</th>
                  <th className="px-5 py-3">স্ন্যাপশট ইঞ্জিন (প্রধান)</th>
                  <th className="px-5 py-3">শ্যাডো-ডম ইঞ্জিন (বিকল্প)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {matrix.map((m) => (
                  <tr key={m.feature}>
                    <td className="px-5 py-3 font-medium">{m.feature}</td>
                    <td className="px-5 py-3 text-[#374151]">{m.agentBrowser}</td>
                    <td className="px-5 py-3 text-[#374151]">{m.playwright}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-[var(--color-line)] px-5 py-3.5 text-[12.5px] text-[var(--color-muted)]">
              নিয়ম: ৯০% কাজ স্ন্যাপশট ইঞ্জিন করে। শ্যাডো-ডম নির্ভর পোর্টাল, ক্রস-অরিজিন আইফ্রেম ও ডাউনলোড-নির্ভর প্রবাহে বিকল্প ইঞ্জিন ব্যবহৃত হয়।
            </div>
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