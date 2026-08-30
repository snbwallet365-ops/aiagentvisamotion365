"use client";

import { useEffect, useState } from "react";
import { Badge, Empty, PageHeader, Progress, Stat } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface SkillStat { task: string; label: string; specialists: number; requests: number; tokens: number; avgLatency: number }
interface RecentRow { id: number; skill: string; inputTokens: number; outputTokens: number; latencyMs: number; engine: string; createdAt: string }
interface UsageData {
  totals: { requests: number; tokens: number };
  skills: SkillStat[];
  recent: RecentRow[];
  engineCount: number;
  modalities: { text: number; multimodal: number; audio: number; embedding: number };
  avgSuccess: number;
  provider: string;
}
interface MonData {
  health: { database: string; aiEngine: string; engineCount: number; automation: string };
  pipeline: { status: string; statusBn: string; count: number; avgHours: number }[];
  countries: { country: string; count: number; avgScore: number; value: number }[];
  failedWorkflows: { id: number; workflow: string; country: string; attempts: number; result: string; at: string }[];
  usage24h: { requests: number; tokens: number; avgLatency: number };
  totals: { clients: number; workflowRuns: number; workflowSuccessRate: number; messages: number; socialPosts: number; documents: number };
}

export default function SystemPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [mon, setMon] = useState<MonData | null>(null);
  const [tab, setTab] = useState<"monitor" | "skills">("monitor");
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  function statusReport(u: UsageData, m: MonData): PreviewDoc {
    return {
      title: `Operations report — ${new Date().toLocaleDateString("en-GB")}`,
      body: [
        `# Operations report`,
        ``,
        `## System health`,
        `| Component | Status |`,
        `| --- | --- |`,
        `| Database | ${m.health.database} |`,
        `| AI engine | ${m.health.aiEngine} |`,
        `| Automation | ${m.health.automation} |`,
        `| Engines available | ${m.health.engineCount} |`,
        ``,
        `## Totals`,
        `| Metric | Value |`,
        `| --- | --- |`,
        `| Clients | ${m.totals.clients} |`,
        `| Automation runs | ${m.totals.workflowRuns} (${m.totals.workflowSuccessRate}% success) |`,
        `| Messages sent | ${m.totals.messages} |`,
        `| Documents generated | ${m.totals.documents} |`,
        `| Social posts | ${m.totals.socialPosts} |`,
        `| Tokens (24h) | ${m.usage24h.tokens} across ${m.usage24h.requests} requests |`,
        ``,
        `## Application pipeline`,
        `| Stage | Count | Average hours |`,
        `| --- | --- | --- |`,
        ...m.pipeline.map((p) => `| ${p.statusBn} | ${p.count} | ${p.avgHours} |`),
        ``,
        `## Volume by country`,
        `| Country | Files | Average score | Pipeline value |`,
        `| --- | --- | --- | --- |`,
        ...m.countries.map((c) => `| ${c.country} | ${c.count} | ${c.avgScore} | ${c.value} |`),
        ``,
        `## Skill routing`,
        `| Skill | Specialists | Requests | Tokens |`,
        `| --- | --- | --- | --- |`,
        ...u.skills.map((s) => `| ${s.label} | ${s.specialists} | ${s.requests} | ${s.tokens} |`),
        ``,
        m.failedWorkflows.length
          ? `## Failed automations\n${m.failedWorkflows.map((f) => `- ${f.workflow} (${f.country}) — ${f.attempts} attempts: ${f.result}`).join("\n")}`
          : `## Failed automations\nNone — all runs completed successfully.`,
      ].join("\n"),
    };
  }

  const load = async () => {
    const [u, m] = await Promise.all([
      fetch("/api/usage").then((r) => r.json()),
      fetch("/api/monitoring").then((r) => r.json()),
    ]);
    setUsage(u); setMon(m);
  };
  useEffect(() => { void load(); }, []);

  if (!usage || !mon) return <PageHeader title="সিস্টেম" subtitle="তথ্য লোড হচ্ছে…" />;

  const maxReq = Math.max(1, ...usage.skills.map((s) => s.requests));
  const maxPipe = Math.max(1, ...mon.pipeline.map((p) => p.count));

  return (
    <div>
      <PageHeader
        title="সিস্টেম ও মনিটরিং"
        subtitle="অভ্যন্তরীণ ইঞ্জিন, পাইপলাইন স্বাস্থ্য ও ব্যবহারের হিসাব"
        actions={
          <>
            <Badge tone={usage.provider === "cloud" ? "green" : "blue"}>
              {usage.provider === "cloud" ? "ক্লাউড ইঞ্জিন সক্রিয়" : "অভ্যন্তরীণ ইঞ্জিন সক্রিয়"}
            </Badge>
            <button className="cx-btn px-3 py-1.5 text-[12.5px]" onClick={() => usage && mon && setPreview(statusReport(usage, mon))}>
              রিপোর্ট প্রিভিউ
            </button>
            <a className="cx-btn px-3 py-1.5 text-[12.5px]" href="/api/export">⬇ CSV এক্সপোর্ট</a>
            <button className="cx-btn" onClick={() => void load()}>রিফ্রেশ</button>
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        {/* স্বাস্থ্য */}
        <div className="grid gap-3 sm:grid-cols-4">
          {([
            ["ডাটাবেজ", mon.health.database, "green"],
            ["এআই ইঞ্জিন", mon.health.aiEngine, usage.provider === "cloud" ? "green" : "blue"],
            ["অটোমেশন", mon.health.automation, "green"],
            ["ইঞ্জিন সংখ্যা", `${mon.health.engineCount.toLocaleString("bn-BD")}টি`, "purple"],
          ] as const).map(([label, value, tone]) => (
            <div key={label} className="cx-card flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-[11.5px] text-[var(--color-muted)]">{label}</div>
                <div className="mt-0.5 text-[13.5px] font-medium">{value}</div>
              </div>
              <Badge tone={tone}>●</Badge>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="ক্লায়েন্ট" value={mon.totals.clients.toLocaleString("bn-BD")} />
          <Stat label="অটোমেশন রান" value={mon.totals.workflowRuns.toLocaleString("bn-BD")} hint={`সফল ${mon.totals.workflowSuccessRate.toLocaleString("bn-BD")}%`} />
          <Stat label="বার্তা" value={mon.totals.messages.toLocaleString("bn-BD")} />
          <Stat label="ডকুমেন্ট" value={mon.totals.documents.toLocaleString("bn-BD")} />
          <Stat label="সোশ্যাল পোস্ট" value={mon.totals.socialPosts.toLocaleString("bn-BD")} />
          <Stat label="২৪ ঘণ্টার টোকেন" value={mon.usage24h.tokens.toLocaleString("bn-BD")} hint={`${mon.usage24h.requests.toLocaleString("bn-BD")} অনুরোধ`} />
        </div>

        <div className="flex flex-wrap gap-2">
          {([["monitor", "পাইপলাইন মনিটর"], ["skills", "দক্ষতা রাউটিং"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`cx-btn ${tab === k ? "cx-btn-dark" : "cx-btn"}`}>{l}</button>
          ))}
        </div>

        {tab === "monitor" && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="cx-card overflow-hidden">
                <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">আবেদনের পাইপলাইন</div>
                {mon.pipeline.length === 0 ? <Empty>কোনো আবেদন নেই।</Empty> : (
                  <div className="space-y-2.5 px-5 py-4">
                    {mon.pipeline.map((p) => (
                      <div key={p.status}>
                        <div className="mb-1 flex justify-between text-[12.5px]">
                          <span>{p.statusBn}</span>
                          <span className="text-[var(--color-muted)]">
                            {p.count.toLocaleString("bn-BD")}টি{p.avgHours > 0 && ` · গড় ${p.avgHours.toLocaleString("bn-BD")} ঘণ্টা`}
                          </span>
                        </div>
                        <Progress value={(p.count / maxPipe) * 100} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cx-card overflow-hidden">
                <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">দেশভিত্তিক ভলিউম</div>
                <div className="divide-y divide-[var(--color-line)]">
                  {mon.countries.map((c) => (
                    <div key={c.country} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                      <span>{c.country}</span>
                      <span className="text-[12px] text-[var(--color-muted)]">
                        {c.count.toLocaleString("bn-BD")}টি · গড় স্কোর {c.avgScore.toLocaleString("bn-BD")} · মূল্য {c.value.toLocaleString("bn-BD")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cx-card overflow-hidden">
              <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">ব্যর্থ অটোমেশন (মানব হস্তক্ষেপ প্রয়োজন)</div>
              {mon.failedWorkflows.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13.5px] text-[#12a150]">কোনো ব্যর্থ রান নেই — সব ঠিকভাবে চলছে।</div>
              ) : (
                <div className="divide-y divide-[var(--color-line)]">
                  {mon.failedWorkflows.map((f) => (
                    <div key={f.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="red">ব্যর্থ</Badge>
                        <span className="text-[13px] font-medium">{f.workflow}</span>
                        <span className="text-[12px] text-[var(--color-muted)]">{f.country} · {f.attempts.toLocaleString("bn-BD")} প্রচেষ্টা</span>
                        <span className="ml-auto text-[11.5px] text-[var(--color-muted)]">{new Date(f.at).toLocaleString("bn-BD")}</span>
                      </div>
                      <div className="mt-1 text-[12.5px] text-[#374151]">{f.result}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "skills" && (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {([
                ["টেক্সট ইঞ্জিন", usage.modalities.text],
                ["মাল্টিমোডাল", usage.modalities.multimodal],
                ["ভয়েস", usage.modalities.audio],
                ["এমবেডিং", usage.modalities.embedding],
              ] as const).map(([label, v]) => (
                <div key={label} className="cx-card px-4 py-3.5">
                  <div className="text-[12px] text-[var(--color-muted)]">{label}</div>
                  <div className="mt-0.5 text-[18px] font-semibold">{v.toLocaleString("bn-BD")}টি</div>
                </div>
              ))}
            </div>

            <div className="cx-card overflow-hidden">
              <div className="border-b border-[var(--color-line)] px-5 py-3.5">
                <div className="text-[14px] font-semibold">দক্ষতা রাউটিং</div>
                <div className="mt-0.5 text-[12px] text-[var(--color-muted)]">
                  প্রতিটি কাজের জন্য একাধিক বিশেষজ্ঞ ইঞ্জিন সাজানো — একটি ব্যর্থ হলে পরেরটি সঙ্গে সঙ্গে দায়িত্ব নেয়।
                </div>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {usage.skills.map((s) => (
                  <div key={s.task} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-[140px] text-[13.5px] font-medium">{s.label}</div>
                    <div className="min-w-[130px] flex-1"><Progress value={(s.requests / maxReq) * 100} /></div>
                    <div className="text-[12px] text-[var(--color-muted)]">
                      {s.specialists.toLocaleString("bn-BD")} বিশেষজ্ঞ · {s.requests.toLocaleString("bn-BD")} অনুরোধ · {s.tokens.toLocaleString("bn-BD")} টোকেন
                      {s.avgLatency > 0 && ` · গড় ${s.avgLatency.toLocaleString("bn-BD")} মিলিসেকেন্ড`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cx-card overflow-hidden">
              <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">সাম্প্রতিক কার্যক্রম</div>
              {usage.recent.length === 0 ? <Empty>এখনও কোনো কার্যক্রম নেই — এআই এজেন্ট পাতায় একটি প্রশ্ন করুন।</Empty> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[var(--color-soft)] text-left text-[11.5px] text-[var(--color-muted)]">
                      <tr>
                        <th className="px-5 py-2.5">দক্ষতা</th><th className="px-5 py-2.5">ইনপুট</th>
                        <th className="px-5 py-2.5">আউটপুট</th><th className="px-5 py-2.5">সময়</th>
                        <th className="px-5 py-2.5">ইঞ্জিন</th><th className="px-5 py-2.5">সময়কাল</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {usage.recent.map((r) => (
                        <tr key={r.id}>
                          <td className="px-5 py-2.5">{r.skill}</td>
                          <td className="px-5 py-2.5">{r.inputTokens.toLocaleString("bn-BD")}</td>
                          <td className="px-5 py-2.5">{r.outputTokens.toLocaleString("bn-BD")}</td>
                          <td className="px-5 py-2.5">{r.latencyMs.toLocaleString("bn-BD")} মিলিসেকেন্ড</td>
                          <td className="px-5 py-2.5"><Badge tone={r.engine === "ক্লাউড ইঞ্জিন" ? "green" : "neutral"}>{r.engine}</Badge></td>
                          <td className="px-5 py-2.5 text-[var(--color-muted)]">{new Date(r.createdAt).toLocaleTimeString("bn-BD")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <div className="cx-card p-5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
          গোপনীয়তা: VisaMOTion কখনও অভ্যন্তরীণ ইঞ্জিন বা সরবরাহকারীর নাম প্রকাশ করে না। সব উত্তর সম্পূর্ণ বাংলায় দেওয়া হয়,
          এবং ক্লাউড সংযোগ না থাকলেও অভ্যন্তরীণ ভিসা ইঞ্জিন দিয়ে প্ল্যাটফর্ম সম্পূর্ণ কার্যকর থাকে।
        </div>
      </div>
      <DocPreview doc={preview} onClose={() => setPreview(null)} />

      <footer className="cx-micro border-t border-[var(--color-line)] py-3 text-center text-xs text-gray-400">
        VisaMOTion Ai Agent All in One Platform | Specially Visa Agency
      </footer>
    </div>
  );
}