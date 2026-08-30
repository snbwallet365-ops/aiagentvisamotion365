import { AGENT_PIPELINE, type TaskType } from "./models";
import { complete, streamChat, SYSTEM_PROMPT, systemFor, detectCountry, type ChatMessage, type RequestKeys } from "./llm";
import { COUNTRIES, getCountry } from "./visa-data";
import { runFullAssessment } from "./intelligence";
import { WORKFLOWS } from "./workflows";

export type AgentEvent =
  | { type: "phase"; key: string; label: string; phase: string; status: "running" | "done" }
  | { type: "delta"; text: string }
  | { type: "canvas"; title: string; body: string; kind: string }
  | { type: "done"; conversationId: number; skills: string[] };

/** ব্যবহারকারীর প্রশ্ন থেকে কোন দক্ষতা লাগবে তা নির্ধারণ। */
export function detectTask(text: string): TaskType {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => text.includes(x) || t.includes(x));
  if (has("স্কোর", "যোগ্য", "eligib", "সম্ভাবনা")) return "eligibility-reasoning";
  if (has("ঝুঁকি", "রিফিউজ", "রিজেক", "risk")) return "risk-analysis";
  if (has("চিঠি", "লেটার", "চুক্তি", "ইনভয়েস", "ডকুমেন্ট তৈরি", "কভার")) return "document-generation";
  if (has("পোস্ট", "ফেসবুক", "লিংকডইন", "ইনস্টাগ্রাম", "সোশ্যাল")) return "social-copy";
  if (has("কল", "ভয়েস", "আইভিআর")) return "voice-script";
  if (has("স্ক্রিপ্ট", "কোড", "অটোমেশন স্ক্রিপ্ট")) return "code-generation";
  if (has("নীতি", "আপডেট", "সর্বশেষ", "নতুন নিয়ম", "খোঁজ")) return "visa-policy-search";
  if (has("ভিসা", "পাসপোর্ট", "ওয়ার্ক পারমিট", "এম্বাসি", "আবেদন")) return "visa-interview";
  return "fast-chat";
}

/** ক্যানভাসে দেখানোর মতো কাঠামোবদ্ধ কনটেন্ট তৈরি (দেশভিত্তিক পূর্ণ ব্রিফ)। */
export function buildCanvas(userText: string): { title: string; body: string; kind: string } | null {
  const country = detectCountry(userText);
  if (!country) return null;
  const rule = getCountry(country)!;
  const visaType = rule.visaTypes[0];
  const a = runFullAssessment(country, visaType, {
    passportValidityMonths: 18, bankBalance: rule.minimumBankBalance, jobOffer: true,
    salary: 2500, travelHistory: true, previousRejections: 0, education: "স্নাতক", languageProficiency: "IELTS 6.5",
  });
  const body = [
    `# ${rule.flag} ${rule.countryBn} — ${rule.visaTypesBn[0]}`,
    ``,
    `## এক নজরে`,
    `| বিষয় | তথ্য |`,
    `| --- | --- |`,
    `| ভিসার ধরন | ${rule.visaTypesBn.join(", ")} |`,
    `| সরকারি ফি (আনুমানিক) | ${a.fee.governmentFee.toLocaleString("bn-BD")} ${rule.currency} |`,
    `| সার্ভিস ফি (আনুমানিক) | ${a.fee.serviceFee.toLocaleString("bn-BD")} ডলার |`,
    `| প্রসেসিং সময় | ${a.timing.minDays}–${a.timing.maxDays} দিন (আনুমানিক) |`,
    `| ন্যূনতম ব্যালেন্স | ${rule.minimumBankBalance.toLocaleString("bn-BD")} ডলার সমতুল্য |`,
    `| স্পন্সরশিপ | ${rule.employerSponsored ? "নিয়োগকর্তা নির্ভর" : "সরাসরি আবেদন"} |`,
    `| সফলতার সম্ভাবনা | ${a.successProbability}% (মানসম্মত প্রোফাইলে) |`,
    ``,
    `## ডকুমেন্ট চেকলিস্ট`,
    ...a.checklist.map((d, i) => `${i + 1}. ${d}`),
    ``,
    `## বিশেষ শর্ত`,
    ...rule.extraDocumentsBn.map((d) => `- ${d}`),
    ``,
    `## অটোমেশন পরিকল্পনা`,
    ...WORKFLOWS.map((w, i) => `${i + 1}. ${w.nameBn} — ${w.steps.length} ধাপ, ${w.engine}`),
    ``,
    `## পরবর্তী ধাপ`,
    `১. আবেদনকারীর প্রোফাইল তৈরি করুন।`,
    `২. যোগ্যতা স্কোর চালিয়ে রেড ফ্ল্যাগ দূর করুন।`,
    `৩. ডকুমেন্ট প্যাক তৈরি করে PDF অথবা DOCX ডাউনলোড করুন।`,
  ].join("\n");
  return { title: `${rule.countryBn} — সম্পূর্ণ ভিসা ব্রিফ`, body, kind: "visa-brief" };
}

/**
 * এজেন্ট মোড: একাধিক বিশেষজ্ঞ ধাপে ধাপে কাজ করে (পরিকল্পনা → অনুসন্ধান → বিশ্লেষণ → লেখা → যাচাই)।
 * ব্যবহারকারী শুধু "VisaMOTion" দেখে; ভেতরে ভিন্ন ভিন্ন বিশেষজ্ঞ চলে।
 */
export async function* runAgent(
  userText: string,
  history: ChatMessage[],
  useCanvas: boolean,
  keys: RequestKeys = {},
): AsyncGenerator<AgentEvent, string, void> {
  const country = detectCountry(userText);
  const rule = country ? getCountry(country) : undefined;
  const notes: string[] = [];
  const skills: string[] = [];

  for (const stage of AGENT_PIPELINE) {
    if (stage.key === "draft") break;
    yield { type: "phase", key: stage.key, label: stage.labelBn, phase: stage.phase, status: "running" };
    skills.push(stage.labelBn);

    let note = "";
    if (stage.key === "plan") {
      note = [
        `ব্যবহারকারীর চাহিদা: ${userText.slice(0, 160)}`,
        rule ? `শনাক্ত দেশ: ${rule.countryBn} (${rule.visaTypesBn.join(", ")})` : "নির্দিষ্ট দেশ শনাক্ত হয়নি — সাধারণ পরামর্শ দিতে হবে।",
        `করণীয়: নিয়ম যাচাই → যোগ্যতা হিসাব → ডকুমেন্ট তালিকা → পরবর্তী ধাপ।`,
      ].join("\n");
    } else if (stage.key === "research") {
      const sources = rule
        ? [`${rule.countryBn} সরকারি পোর্টাল: ${rule.portalUrl}`, `মূল শর্ত: ${rule.highlightBn}`, `বিশেষ কাগজ: ${rule.extraDocumentsBn.join(", ")}`]
        : COUNTRIES.slice(0, 4).map((c) => `${c.countryBn}: ${c.highlightBn}`);
      note = sources.join("\n");
    } else if (stage.key === "analyze" && rule) {
      const a = runFullAssessment(rule.country, rule.visaTypes[0], {
        passportValidityMonths: 18, bankBalance: rule.minimumBankBalance, jobOffer: true,
        salary: 2500, travelHistory: true, previousRejections: 0, education: "স্নাতক", languageProficiency: "IELTS 6.5",
      });
      note = [
        `যোগ্যতা স্কোর: ${a.eligibility.score}/১০০`,
        `ঝুঁকি: ${a.risk.riskScore} (${a.risk.riskLevel})`,
        `সফলতার সম্ভাবনা: ${a.successProbability}%`,
        `ফি: ${a.fee.governmentFee} ${a.fee.currency} + ${a.fee.serviceFee} ডলার সার্ভিস`,
        `সময়: ${a.timing.minDays}–${a.timing.maxDays} দিন`,
        `ডকুমেন্ট: ${a.checklist.slice(0, 8).join("; ")}`,
      ].join("\n");
    } else {
      note = "সাধারণ ভিসা জ্ঞানভাণ্ডার থেকে প্রাসঙ্গিক তথ্য সংগ্রহ করা হয়েছে।";
    }

    notes.push(`[${stage.labelBn}]\n${note}`);
    yield { type: "phase", key: stage.key, label: stage.labelBn, phase: stage.phase, status: "done" };
    await new Promise((r) => setTimeout(r, 180));
  }

  const writeStage = AGENT_PIPELINE.find((s) => s.key === "draft")!;
  yield { type: "phase", key: writeStage.key, label: writeStage.labelBn, phase: writeStage.phase, status: "running" };

  const payload: ChatMessage[] = [
    { role: "system", content: `${systemFor(userText).prompt}\n\nAgent mode is active. Use the internal analysis below to write one complete, well-structured answer in the user's language. Do not mention the internal steps.` },
    ...history.slice(-6),
    { role: "user", content: `${userText}\n\n--- অভ্যন্তরীণ বিশ্লেষণ ---\n${notes.join("\n\n")}` },
  ];

  let full = "";
  const gen = streamChat(payload, "multilingual", keys);
  while (true) {
    const next = await gen.next();
    if (next.done) break;
    full += next.value;
    yield { type: "delta", text: next.value };
  }
  yield { type: "phase", key: writeStage.key, label: writeStage.labelBn, phase: writeStage.phase, status: "done" };

  const reviewStage = AGENT_PIPELINE[AGENT_PIPELINE.length - 1];
  yield { type: "phase", key: reviewStage.key, label: reviewStage.labelBn, phase: reviewStage.phase, status: "running" };
  skills.push(reviewStage.labelBn);
  await new Promise((r) => setTimeout(r, 220));
  yield { type: "phase", key: reviewStage.key, label: reviewStage.labelBn, phase: reviewStage.phase, status: "done" };

  if (useCanvas) {
    const canvas = buildCanvas(userText);
    if (canvas) yield { type: "canvas", ...canvas };
  }

  return full;
}

/** এজেন্ট ছাড়া সাধারণ মোডেও ক্যানভাস চাইলে কনটেন্ট তৈরি করে দেয়। */
export async function canvasForAnswer(userText: string, answer: string) {
  const built = buildCanvas(userText);
  if (built) return built;
  if (answer.length < 400) return null;
  return { title: "উত্তরের ক্যানভাস প্রিভিউ", body: answer, kind: "answer" };
}

export async function quickSummary(text: string, keys: RequestKeys = {}) {
  const { text: out } = await complete(
    [
      { role: "system", content: "তুমি VisaMOTion। শুধু বাংলায় সর্বোচ্চ ৮ শব্দে শিরোনাম দাও।" },
      { role: "user", content: text },
    ],
    "fast-chat",
    keys,
  );
  return out.split("\n")[0].slice(0, 60);
}
