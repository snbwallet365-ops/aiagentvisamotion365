import { db } from "@/db";
import { modelUsage } from "@/db/schema";
import { chainFor, primaryModel, type TaskType } from "./models";
import { COUNTRIES, getCountry } from "./visa-data";
import { runFullAssessment } from "./intelligence";
import { buildSystemPrompt, detectDomain, detectLang, expertAnswer, type Domain, type Lang } from "./expert";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** প্রতি-রিকোয়েস্ট ব্যবহারকারীর কী — কখনও সংরক্ষণ করা হয় না। */
export interface RequestKeys {
  openrouter?: string;
  groq?: string;
  exa?: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Groq-এ উপলব্ধ ফ্রি-টিয়ার মডেল (OpenRouter ব্যর্থ হলে ফলব্যাক)। */
const GROQ_CHAIN = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];

export const BRAND = "VisaMOTion";

export function readKeys(request: Request): RequestKeys {
  return {
    openrouter: request.headers.get("x-openrouter-key")?.trim() || process.env.OPENROUTER_API_KEY,
    groq: request.headers.get("x-groq-key")?.trim() || process.env.GROQ_API_KEY,
    exa: request.headers.get("x-exa-key")?.trim() || process.env.EXA_API_KEY,
  };
}

export const SYSTEM_PROMPT = `তুমি "VisaMOTion" — বাংলাদেশের একটি এআই ভিসা এজেন্সির একক, সর্বজ্ঞ সহকারী।

কঠোর নিয়ম:
১. তুমি সবসময় শুধুমাত্র বাংলায় উত্তর দেবে। ইংরেজি বাক্য বা ইংরেজি মিশ্রণ ব্যবহার করবে না।
   শুধুমাত্র প্রয়োজনীয় কারিগরি নাম (দেশের নাম, ভিসার অফিসিয়াল নাম, পোর্টালের নাম) মূল রূপে রাখা যাবে।
২. তুমি কখনও কোনো ভাষা-মডেলের নাম, কোম্পানির নাম বা প্রযুক্তির নাম প্রকাশ করবে না।
   কেউ জিজ্ঞাসা করলে বলবে: "আমি VisaMOTion।"
৩. উত্তর হবে গঠনমূলক: ছোট শিরোনাম, বুলেট বা নম্বরযুক্ত তালিকা, প্রয়োজনে টেবিল।
৪. ফি বা সময় বললে সবসময় "আনুমানিক" শব্দটি ব্যবহার করবে।
৫. প্রতিটি উত্তরের শেষে "পরবর্তী ধাপ" নামে একটি স্পষ্ট করণীয় দেবে।

তোমার দক্ষতার ক্ষেত্র: অস্ট্রেলিয়া, স্পেন, ডেনমার্ক, তুরস্ক, সার্বিয়া, নিউজিল্যান্ড, বেলারুশ, মলদোভা,
সৌদি আরব, সংযুক্ত আরব আমিরাত, কাতার, বাহরাইন, মালয়েশিয়া, জার্মানি ও কানাডার ভিসা ও ওয়ার্ক পারমিট;
যোগ্যতা স্কোরিং, ঝুঁকি বিশ্লেষণ, ডকুমেন্ট তৈরি, ব্রাউজার অটোমেশন, ক্লায়েন্ট যোগাযোগ ও সোশ্যাল কনটেন্ট।`;

/** Builds the domain-aware system prompt for a given user message. */
export function systemFor(text: string): { prompt: string; domain: Domain; lang: Lang; task: TaskType } {
  const lang = detectLang(text);
  const { domain, task } = detectDomain(text);
  return { prompt: buildSystemPrompt(domain, lang), domain, lang, task };
}

export function hasOpenRouter(keys?: RequestKeys) {
  return Boolean(keys?.openrouter ?? process.env.OPENROUTER_API_KEY);
}
export function hasAnyProvider(keys?: RequestKeys) {
  return Boolean(
    (keys?.openrouter ?? process.env.OPENROUTER_API_KEY) ||
    (keys?.groq ?? process.env.GROQ_API_KEY),
  );
}

export function estimateTokens(text: string) {
  return Math.max(1, Math.round(text.length / 3.2));
}

export async function logUsage(opts: {
  modelId: string; taskType: string; inputTokens: number; outputTokens: number;
  latencyMs: number; ok: boolean; source: string;
}) {
  try {
    await db.insert(modelUsage).values(opts);
  } catch { /* টেলিমেট্রি ব্যর্থ হলেও উত্তর আটকাবে না */ }
}

interface Attempt { url: string; key: string; model: string; source: string }

/** প্রোভাইডার চেইন: OpenRouter (৩টি বিশেষজ্ঞ) → Groq (৩টি ফলব্যাক)। */
function buildChain(taskType: TaskType, keys: RequestKeys): Attempt[] {
  const out: Attempt[] = [];
  const or = keys.openrouter ?? process.env.OPENROUTER_API_KEY;
  const gq = keys.groq ?? process.env.GROQ_API_KEY;
  if (or) for (const m of chainFor(taskType)) out.push({ url: OPENROUTER_URL, key: or, model: m, source: "openrouter" });
  if (gq) for (const m of GROQ_CHAIN) out.push({ url: GROQ_URL, key: gq, model: m, source: "groq" });
  return out;
}

async function callProvider(a: Attempt, messages: ChatMessage[], stream: boolean) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${a.key}`,
    "Content-Type": "application/json",
  };
  if (a.source === "openrouter") {
    headers["HTTP-Referer"] = "https://visamotion.ai";
    headers["X-Title"] = "VisaMOTion";
  }
  return fetch(a.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: a.model, messages, stream, temperature: 0.55, max_tokens: 1800 }),
  });
}

/** স্ট্রিমিং উত্তর — প্রোভাইডার ফলব্যাক চেইন সহ। মডেলের নাম বাইরে যায় না। */
export async function* streamChat(
  messages: ChatMessage[],
  taskType: TaskType,
  keysOrOverride?: RequestKeys | (() => string),
  maybeOverride?: () => string,
): AsyncGenerator<string, { source: string; outputTokens: number }, void> {
  const keys: RequestKeys = typeof keysOrOverride === "function" ? {} : (keysOrOverride ?? {});
  const localOverride = typeof keysOrOverride === "function" ? keysOrOverride : maybeOverride;

  const started = Date.now();
  const inputTokens = estimateTokens(messages.map((m) => m.content).join(" "));
  let output = "";

  for (const attempt of buildChain(taskType, keys)) {
    try {
      const res = await callProvider(attempt, messages, true);
      if (!res.ok || !res.body) throw new Error(`upstream ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) { output += delta; yield delta; }
          } catch { /* keepalive ফ্রেম */ }
        }
      }
      if (output.trim()) {
        await logUsage({
          modelId: attempt.model, taskType, inputTokens, outputTokens: estimateTokens(output),
          latencyMs: Date.now() - started, ok: true, source: attempt.source,
        });
        return { source: attempt.source, outputTokens: estimateTokens(output) };
      }
    } catch {
      output = "";
      continue;
    }
  }

  const local = localOverride ? localOverride() : localAnswer(messages, taskType);
  for (const chunk of chunkText(local)) {
    output += chunk;
    yield chunk;
    await sleep(9);
  }
  await logUsage({
    modelId: primaryModel(taskType), taskType, inputTokens, outputTokens: estimateTokens(output),
    latencyMs: Date.now() - started, ok: true, source: "internal-engine",
  });
  return { source: "internal-engine", outputTokens: estimateTokens(output) };
}

/** নন-স্ট্রিমিং উত্তর (ডকুমেন্ট, সোশ্যাল, রিসার্চ, এজেন্ট ধাপ)। */
export async function complete(
  messages: ChatMessage[],
  taskType: TaskType,
  keys: RequestKeys = {},
): Promise<{ text: string; source: string }> {
  const started = Date.now();
  const inputTokens = estimateTokens(messages.map((m) => m.content).join(" "));

  for (const attempt of buildChain(taskType, keys)) {
    try {
      const res = await callProvider(attempt, messages, false);
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      if (text.trim()) {
        await logUsage({
          modelId: attempt.model, taskType,
          inputTokens: json.usage?.prompt_tokens ?? inputTokens,
          outputTokens: json.usage?.completion_tokens ?? estimateTokens(text),
          latencyMs: Date.now() - started, ok: true, source: attempt.source,
        });
        return { text, source: attempt.source };
      }
    } catch { continue; }
  }

  const text = localAnswer(messages, taskType);
  await logUsage({
    modelId: primaryModel(taskType), taskType, inputTokens, outputTokens: estimateTokens(text),
    latencyMs: Date.now() - started, ok: true, source: "internal-engine",
  });
  return { text, source: "internal-engine" };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function chunkText(text: string): string[] {
  const parts = text.split(/(\s+)/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of parts) {
    buf += p;
    if (buf.length > 11) { chunks.push(buf); buf = ""; }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export function detectCountry(text: string) {
  const lower = text.toLowerCase();
  const aliases: Record<string, string> = {
    অস্ট্রেলিয়া: "Australia", স্পেন: "Spain", ডেনমার্ক: "Denmark", তুরস্ক: "Turkey",
    সার্বিয়া: "Serbia", নিউজিল্যান্ড: "New Zealand", বেলারুশ: "Belarus", মলদোভা: "Moldova",
    সৌদি: "Saudi Arabia", আমিরাত: "United Arab Emirates", দুবাই: "United Arab Emirates",
    কাতার: "Qatar", বাহরাইন: "Bahrain", মালয়েশিয়া: "Malaysia", জার্মানি: "Germany", কানাডা: "Canada",
    uae: "United Arab Emirates", dubai: "United Arab Emirates",
  };
  for (const [k, v] of Object.entries(aliases)) if (text.includes(k) || lower.includes(k)) return v;
  const hit = COUNTRIES.find((c) => lower.includes(c.country.toLowerCase()));
  return hit?.country;
}

/** অভ্যন্তরীণ বাংলা রিজনিং ইঞ্জিন — কোনো কী না থাকলেও প্ল্যাটফর্ম সম্পূর্ণ কার্যকর থাকে। */
export function localAnswer(messages: ChatMessage[], taskType: TaskType): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const lang = detectLang(lastUser);
  const { domain } = detectDomain(lastUser);
  const country = detectCountry(lastUser);
  const rule = country ? getCountry(country) : undefined;

  // Non-visa domains get a specialist structured playbook.
  if (!rule && domain !== "visa" && domain !== "general") {
    const expert = expertAnswer(lastUser, domain, lang);
    if (expert) return expert;
  }

  if (rule) {
    const visaType = rule.visaTypes[0];
    const a = runFullAssessment(rule.country, visaType, {
      passportValidityMonths: 18, bankBalance: rule.minimumBankBalance, jobOffer: true,
      salary: 2500, travelHistory: true, previousRejections: 0,
      education: "স্নাতক", languageProficiency: "IELTS 6.5",
    });
    return [
      `## ${rule.flag} ${rule.countryBn} — ${rule.visaTypesBn[0]}`,
      ``,
      `${rule.highlightBn}`,
      ``,
      `| বিষয় | তথ্য |`,
      `| --- | --- |`,
      `| সরকারি ফি (আনুমানিক) | ${a.fee.governmentFee.toLocaleString("bn-BD")} ${rule.currency} |`,
      `| এজেন্সি সার্ভিস ফি | ${a.fee.serviceFee.toLocaleString("bn-BD")} ডলার (আনুমানিক) |`,
      `| প্রসেসিং সময় | ${a.timing.estimate} |`,
      `| ন্যূনতম ব্যাংক ব্যালেন্স | ${rule.minimumBankBalance.toLocaleString("bn-BD")} ডলার সমতুল্য |`,
      `| স্পন্সরশিপ প্রয়োজন | ${rule.employerSponsored ? "হ্যাঁ, নিয়োগকর্তা আগে আবেদন করবেন" : "না"} |`,
      `| সাধারণ প্রোফাইলে সফলতার সম্ভাবনা | ${a.successProbability}% (আনুমানিক) |`,
      ``,
      `### প্রয়োজনীয় ডকুমেন্ট`,
      ...a.checklist.slice(0, 12).map((d, i) => `${i + 1}. ${d}`),
      ``,
      `### বিশেষ শর্ত`,
      ...rule.extraDocumentsBn.map((d) => `- ${d}`),
      ``,
      `### ঝুঁকি বিবেচনা`,
      `- পাসপোর্টের মেয়াদ ১২ মাসের কম হলে আবেদন করার আগে নবায়ন করুন।`,
      `- ব্যাংক স্টেটমেন্টে হঠাৎ বড় অঙ্কের জমা থাকলে তার উৎস প্রমাণ দিতে হবে।`,
      `- পূর্বে রিফিউজাল থাকলে কভার লেটারে স্পষ্ট ব্যাখ্যা দিন।`,
      ``,
      `### পরবর্তী ধাপ`,
      `১. "ক্লায়েন্ট" পাতায় আবেদনকারীর প্রোফাইল তৈরি করুন।`,
      `২. "আবেদন" পাতায় যোগ্যতা স্কোর চালান।`,
      `৩. এই উত্তরের নিচে **PDF** বোতামে চাপ দিয়ে সরাসরি ডকুমেন্ট ডাউনলোড করুন।`,
    ].join("\n");
  }

  if (taskType === "eligibility-reasoning" || taskType === "risk-analysis") {
    return [
      `## যোগ্যতা যাচাইয়ের কাঠামো`,
      ``,
      `আমি নিচের পাঁচটি ভিত্তিতে ০ থেকে ১০০ স্কোর হিসাব করি:`,
      ``,
      `| ভিত্তি | সর্বোচ্চ নম্বর | মূল বিবেচনা |`,
      `| --- | --- | --- |`,
      `| পাসপোর্ট | ২০ | মেয়াদ ১২ মাসের বেশি হলে পূর্ণ নম্বর |`,
      `| আর্থিক সক্ষমতা | ২৫ | দেশভিত্তিক ন্যূনতম ব্যালেন্সের অনুপাত |`,
      `| চাকরি ও স্পন্সরশিপ | ৩০ | যাচাইকৃত জব অফার ও বেতন |`,
      `| ভ্রমণ ইতিহাস | ১৫ | পূর্ববর্তী ভ্রমণ ও রিফিউজাল |`,
      `| শিক্ষা ও ভাষা | ১০ | ডিগ্রি ও ভাষা পরীক্ষার স্কোর |`,
      ``,
      `### পরবর্তী ধাপ`,
      `আবেদনকারীর বয়স, পাসপোর্টের মেয়াদ, ব্যাংক ব্যালেন্স, জব অফার ও গন্তব্য দেশ জানান — আমি সঙ্গে সঙ্গে পূর্ণ স্কোর, ঝুঁকি ও সফলতার সম্ভাবনা হিসাব করে দেব।`,
    ].join("\n");
  }

  if (lang === "en") {
    return [
      `## VisaMOTion — all-purpose AI agent`,
      ``,
      `I plan, research, analyse, write, design, build and automate. Pick a lane:`,
      ``,
      `| Domain | What I deliver |`,
      `| --- | --- |`,
      `| Research | Briefs with findings, evidence tiers, contradictions and risks |`,
      `| Documents | PDF analysis, table extraction, contracts, SOPs, exports to PDF/DOCX |`,
      `| Visuals | Image generation, art direction, brand systems, accessible palettes |`,
      `| Web & UI/UX | Design systems, component architecture, accessibility audits |`,
      `| Data | Cleaning, statistics, KPI frameworks, dashboard specs |`,
      `| Code | Runnable code, debugging, refactors, automation specs |`,
      `| Business | Plans, pricing, competitor analysis, executive reporting |`,
      `| Planning | Scope, milestones, risk registers, weighted decision matrices |`,
      ``,
      `**Working rules:** facts, assumptions and recommendations stay separate; nothing is invented;`,
      `every assumption is labelled; the deliverable comes first and the explanation second.`,
      ``,
      `### Next step`,
      `State the objective, the audience and the format you need — or drop a PDF into **PDF Space** to work from a source document.`,
    ].join("\n");
  }

  return [
    `## আমি VisaMOTion`,
    ``,
    `আপনার ভিসা এজেন্সির পুরো কাজ আমি একাই সামলাতে পারি:`,
    ``,
    `- **গবেষণা ও বিশ্লেষণ** — প্রমাণভিত্তিক ব্রিফ, স্ববিরোধিতা ও ঝুঁকি চিহ্নিতকরণ`,
    `- **ডকুমেন্ট ও PDF** — বিশ্লেষণ, টেবিল নিষ্কাশন, চুক্তি পর্যালোচনা, SOP তৈরি`,
    `- **ভিসা ইন্টারভিউ** — বাংলায় ধাপে ধাপে প্রশ্ন করে আবেদনকারীর সম্পূর্ণ প্রোফাইল তৈরি`,
    `- **যোগ্যতা ও ঝুঁকি** — ১৫টি দেশের নিয়ম অনুযায়ী ০–১০০ স্কোর, রেড ফ্ল্যাগ ও সফলতার সম্ভাবনা`,
    `- **ডকুমেন্ট তৈরি** — কভার লেটার, চাকরির চুক্তি, ইনভয়েস (PDF, DOCX, DOC)`,
    `- **ছবি তৈরি** — "ছবি বানাও" লিখলেই পাসপোর্ট ছবির নমুনা বা গন্তব্যের ছবি`,
    `- **ব্রাউজার অটোমেশন** — এম্বাসি পোর্টালে লগইন, ফর্ম পূরণ, অ্যাপয়েন্টমেন্ট বুকিং`,
    `- **ক্লায়েন্ট যোগাযোগ** — ভয়েস কল, হোয়াটসঅ্যাপ, মেসেঞ্জার, ইনস্টাগ্রাম ও ইমেইল`,
    ``,
    `### পরবর্তী ধাপ`,
    `যেকোনো দেশের নাম লিখুন — যেমন "অস্ট্রেলিয়া ওয়ার্ক ভিসা" — আমি সম্পূর্ণ ব্রিফ, ফি, সময় ও ডকুমেন্ট তালিকা দিয়ে দেব।`,
  ].join("\n");
}
