"use client";

import { useEffect, useState } from "react";
import type { SocialPost } from "@/db/schema";
import { PLATFORMS, TOPICS, PLATFORM_BN, TOPIC_BN, platformGuide, type Platform, type Topic } from "@/lib/social";
import { COUNTRIES } from "@/lib/visa-data";
import { Badge, CopyButton, Empty, PageHeader, Stat } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

const ICONS: Record<string, string> = { linkedin: "in", instagram: "ig", x: "𝕏", facebook: "f", tiktok: "tt", youtube: "yt" };
const STATUS_BN: Record<string, string> = { published: "প্রকাশিত", scheduled: "শিডিউলড", draft: "খসড়া" };

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [topic, setTopic] = useState<Topic>("visa-update");
  const [country, setCountry] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  const load = async () => {
    const j = await fetch("/api/social").then((r) => r.json());
    setPosts(j.posts ?? []);
  };
  useEffect(() => { void load(); }, []);

  async function generate(schedule = false) {
    setBusy(true);
    await fetch("/api/social", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, topic, country: country || undefined, schedule }),
    });
    setBusy(false);
    void load();
  }

  async function act(id: number, action: "publish" | "schedule") {
    await fetch("/api/social", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    void load();
  }

  async function remove(id: number) {
    await fetch(`/api/social?id=${id}`, { method: "DELETE" });
    void load();
  }

  const published = posts.filter((p) => p.status === "published");
  const impressions = published.reduce((s, p) => s + p.impressions, 0);
  const engagement = published.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  const rate = impressions ? ((engagement / impressions) * 100).toFixed(2) : "০.০০";

  return (
    <div>
      <PageHeader title="সোশ্যাল অটোমেশন" subtitle="লিংকডইন · ইনস্টাগ্রাম · এক্স · ফেসবুক · টিকটক · ইউটিউব" />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="মোট পোস্ট" value={posts.length.toLocaleString("bn-BD")} />
          <Stat label="প্রকাশিত" value={published.length.toLocaleString("bn-BD")} />
          <Stat label="মোট রিচ" value={impressions.toLocaleString("bn-BD")} />
          <Stat label="এনগেজমেন্ট হার" value={`${rate}%`} />
        </div>

        <div className="cx-card p-5">
          <div className="mb-3 text-[14px] font-semibold">নতুন পোস্ট তৈরি করুন</div>
          <div className="grid gap-3 sm:grid-cols-4">
            <select className="cx-input" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_BN[p]}</option>)}
            </select>
            <select className="cx-input" value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
              {TOPICS.map((t) => <option key={t} value={t}>{TOPIC_BN[t]}</option>)}
            </select>
            <select className="cx-input" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">যেকোনো দেশ</option>
              {COUNTRIES.map((c) => <option key={c.country} value={c.country}>{c.flag} {c.countryBn}</option>)}
            </select>
            <div className="flex gap-2">
              <button className="cx-btn cx-btn-dark flex-1" disabled={busy} onClick={() => void generate(false)}>{busy ? "লেখা হচ্ছে…" : "তৈরি করুন"}</button>
              <button className="cx-btn" disabled={busy} onClick={() => void generate(true)}>＋ শিডিউল</button>
            </div>
          </div>
          <div className="mt-3 text-[12px] text-[var(--color-muted)]">{platformGuide(platform)}</div>
        </div>

        {posts.length === 0 ? <Empty>এখনও কোনো পোস্ট নেই।</Empty> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {posts.map((p) => (
              <div key={p.id} className="cx-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#f1f3f4] text-[11px] font-semibold">{ICONS[p.platform] ?? "•"}</span>
                    <span className="text-[13.5px] font-medium">{PLATFORM_BN[p.platform as Platform] ?? p.platform}</span>
                    <Badge tone={p.status === "published" ? "green" : p.status === "scheduled" ? "amber" : "neutral"}>{STATUS_BN[p.status] ?? p.status}</Badge>
                  </div>
                  <span className="text-[11.5px] text-[var(--color-muted)]">{TOPIC_BN[p.topic as Topic] ?? p.topic}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#374151]">{p.caption}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.hashtags.map((h) => <span key={h} className="text-[12px] text-[var(--color-brand)]">{h}</span>)}
                </div>
                {p.callToAction && <div className="mt-2 text-[12.5px] font-medium">↳ {p.callToAction}</div>}
                {p.status === "published" && (
                  <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl bg-[var(--color-soft)] px-3 py-2.5 text-center text-[12px]">
                    <div><div className="font-semibold">{p.likes.toLocaleString("bn-BD")}</div><div className="text-[var(--color-muted)]">লাইক</div></div>
                    <div><div className="font-semibold">{p.comments.toLocaleString("bn-BD")}</div><div className="text-[var(--color-muted)]">মন্তব্য</div></div>
                    <div><div className="font-semibold">{p.shares.toLocaleString("bn-BD")}</div><div className="text-[var(--color-muted)]">শেয়ার</div></div>
                    <div><div className="font-semibold">{p.impressions.toLocaleString("bn-BD")}</div><div className="text-[var(--color-muted)]">রিচ</div></div>
                  </div>
                )}
                {p.scheduledFor && p.status !== "published" && (
                  <div className="mt-2 text-[12px] text-[var(--color-muted)]">প্রকাশের সময়: {new Date(p.scheduledFor).toLocaleString("bn-BD")}</div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={`${p.caption}\n\n${p.hashtags.join(" ")}\n${p.callToAction}`} />
                  <button className="cx-btn px-3 py-1 text-[12px]"
                    onClick={() => setPreview({
                      title: `${PLATFORM_BN[p.platform as Platform] ?? p.platform} — ${TOPIC_BN[p.topic as Topic] ?? p.topic}`,
                      body: `# ${PLATFORM_BN[p.platform as Platform] ?? p.platform}\n\n${p.caption}\n\n## হ্যাশট্যাগ\n${p.hashtags.join(" ")}\n\n## কল টু অ্যাকশন\n${p.callToAction}`,
                    })}>
                    প্রিভিউ
                  </button>
                  {p.status !== "published" && <button className="cx-btn px-3 py-1 text-[12px]" onClick={() => void act(p.id, "publish")}>এখনই প্রকাশ</button>}
                  {p.status === "draft" && <button className="cx-btn px-3 py-1 text-[12px]" onClick={() => void act(p.id, "schedule")}>শিডিউল করুন</button>}
                  <button className="cx-btn px-3 py-1 text-[12px]" onClick={() => void remove(p.id)}>মুছুন</button>
                </div>
              </div>
            ))}
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