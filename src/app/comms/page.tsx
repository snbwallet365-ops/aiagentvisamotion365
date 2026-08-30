"use client";

import { useEffect, useState } from "react";
import type { Client, CommsLog } from "@/db/schema";
import { Badge, Empty, PageHeader, Stat } from "@/components/ui";
import dynamic from "next/dynamic";
import type { PreviewDoc } from "@/components/DocPreview";

const DocPreview = dynamic(() => import("@/components/DocPreview"), { ssr: false });

interface Row { log: CommsLog; client: Client | null }

const CHANNELS = [
  { key: "whatsapp", label: "হোয়াটসঅ্যাপ", icon: "🟢" },
  { key: "email", label: "ইমেইল", icon: "✉️" },
  { key: "voice", label: "ভয়েস কল (আইভিআর)", icon: "📞" },
  { key: "messenger", label: "ফেসবুক মেসেঞ্জার", icon: "💬" },
  { key: "instagram", label: "ইনস্টাগ্রাম ডিএম", icon: "📷" },
  { key: "sms", label: "এসএমএস", icon: "📩" },
];

const INTENTS = [
  { key: "status-update", label: "স্ট্যাটাস আপডেট" },
  { key: "document-request", label: "ডকুমেন্ট চাওয়া" },
  { key: "reminder", label: "রিমাইন্ডার" },
  { key: "appointment-info", label: "অ্যাপয়েন্টমেন্ট তথ্য" },
  { key: "approval", label: "অনুমোদনের সুসংবাদ" },
];

const IVR_MENU = [
  { key: "১", label: "ভিসা স্ট্যাটাস জানতে" },
  { key: "২", label: "ডকুমেন্ট চেকলিস্ট পেতে" },
  { key: "৩", label: "অ্যাপয়েন্টমেন্টের তথ্য" },
  { key: "৪", label: "এজেন্টের সাথে কথা বলতে" },
];

const channelLabel = (k: string) => CHANNELS.find((c) => c.key === k)?.label ?? k;

export default function CommsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | "">("");
  const [channel, setChannel] = useState("whatsapp");
  const [intent, setIntent] = useState("status-update");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  const load = async () => {
    const [l, c] = await Promise.all([
      fetch("/api/comms").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    setRows(l.logs ?? []);
    setClients(c.clients ?? []);
    if ((c.clients ?? []).length) setClientId((p: number | "") => (p === "" ? c.clients[0].id : p));
  };
  useEffect(() => { void load(); }, []);

  async function send() {
    if (!clientId) return;
    setBusy(true);
    await fetch("/api/comms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, channel, intent, custom: custom || undefined }),
    });
    setCustom("");
    setBusy(false);
    void load();
  }

  const byChannel = CHANNELS.map((c) => ({ ...c, count: rows.filter((r) => r.log.channel === c.key).length }));

  return (
    <div>
      <PageHeader title="ক্লায়েন্ট যোগাযোগ" subtitle="ভয়েস, হোয়াটসঅ্যাপ, মেসেঞ্জার, ইনস্টাগ্রাম ও ইমেইল — এক জায়গা থেকে" />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="মোট বার্তা" value={rows.length.toLocaleString("bn-BD")} />
          <Stat label="সক্রিয় চ্যানেল" value={CHANNELS.length.toLocaleString("bn-BD")} />
          <Stat label="ভয়েস কল" value={rows.filter((r) => r.log.channel === "voice").length.toLocaleString("bn-BD")} hint="স্বয়ংক্রিয় আইভিআর" />
          <Stat label="ইমেইল উত্তর" value={rows.filter((r) => r.log.channel === "email").length.toLocaleString("bn-BD")} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="cx-card p-5">
            <div className="mb-3 text-[14px] font-semibold">এআই দিয়ে বার্তা লিখুন</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="cx-input" value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
                <option value="">ক্লায়েন্ট…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
              <select className="cx-input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
              <select className="cx-input" value={intent} onChange={(e) => setIntent(e.target.value)}>
                {INTENTS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>
            </div>
            <textarea className="cx-input mt-3" rows={3} placeholder="খালি রাখলে VisaMOTion নিজেই বাংলায় বার্তা লিখে দেবে…" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <div className="mt-3 flex justify-end">
              <button className="cx-btn cx-btn-dark" disabled={busy || !clientId} onClick={() => void send()}>
                {busy ? "পাঠানো হচ্ছে…" : channel === "voice" ? "স্বয়ংক্রিয় কল করুন" : "বার্তা পাঠান"}
              </button>
            </div>
          </div>

          <div className="cx-card p-5">
            <div className="mb-2 text-[14px] font-semibold">আইভিআর মেনু</div>
            <div className="space-y-1.5">
              {IVR_MENU.map((m) => (
                <div key={m.key} className="flex items-start gap-2 text-[13px]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#f1f3f4] text-[11px] font-semibold">{m.key}</span>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <div className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-muted)]">চ্যানেলভিত্তিক পরিসংখ্যান</div>
              {byChannel.map((c) => (
                <div key={c.key} className="flex items-center justify-between py-0.5 text-[12.5px]">
                  <span>{c.icon} {c.label}</span>
                  <span className="text-[var(--color-muted)]">{c.count.toLocaleString("bn-BD")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="cx-card overflow-hidden">
          <div className="border-b border-[var(--color-line)] px-5 py-3.5 text-[14px] font-semibold">যোগাযোগের লগ</div>
          {rows.length === 0 ? <Empty>এখনও কোনো বার্তা পাঠানো হয়নি।</Empty> : (
            <div className="divide-y divide-[var(--color-line)]">
              {rows.map(({ log, client }) => (
                <div key={log.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={log.channel === "voice" ? "purple" : log.channel === "email" ? "blue" : "green"}>{channelLabel(log.channel)}</Badge>
                    <span className="text-[13.5px] font-medium">{client?.fullName ?? "—"}</span>
                    <span className="text-[12px] text-[var(--color-muted)]">{log.subject}</span>
                    <span className="ml-auto text-[11.5px] text-[var(--color-muted)]">{new Date(log.createdAt).toLocaleString("bn-BD")}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#374151]">{log.body}</p>
                  <button
                    className="cx-btn mt-2 px-3 py-1 text-[11.5px]"
                    onClick={() => setPreview({
                      title: `${channelLabel(log.channel)} — ${client?.fullName ?? "client"}`,
                      body: `# ${log.subject}\n\n**চ্যানেল:** ${channelLabel(log.channel)}\n**প্রাপক:** ${client?.fullName ?? "—"}\n**তারিখ:** ${new Date(log.createdAt).toLocaleString("bn-BD")}\n\n---\n\n${log.body}`,
                    })}
                  >
                    প্রিভিউ ও এক্সপোর্ট
                  </button>
                </div>
              ))}
            </div>
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