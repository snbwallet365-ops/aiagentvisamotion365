import { complete, readKeys } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export const IMAGE_STYLES = [
  "Photoreal", "Illustration", "Infographic", "Document scan", "Social post", "Minimal",
] as const;

/** প্রম্পট থেকে স্থিতিশীল seed — একই প্রম্পটে একই ছবি। */
function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

/**
 * ছবি তৈরি: কী-বিহীন পাবলিক জেনারেটর ব্যবহার করে সরাসরি ইমেজ URL,
 * এবং সবসময় একটি ইনলাইন SVG প্রিভিউ (ফলব্যাক) — যাতে নেটওয়ার্ক ব্যর্থ হলেও কিছু দেখা যায়।
 */
function buildSvg(prompt: string, style: string, seed: number) {
  const h1 = seed % 360, h2 = (seed >> 7) % 360, h3 = (seed >> 13) % 360;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const words = prompt.split(/\s+/).slice(0, 10).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
<defs>
<radialGradient id="a" cx="25%" cy="30%"><stop offset="0%" stop-color="hsl(${h1} 80% 82%)"/><stop offset="100%" stop-color="hsl(${h1} 80% 82%, 0)" stop-opacity="0"/></radialGradient>
<radialGradient id="b" cx="78%" cy="24%"><stop offset="0%" stop-color="hsl(${h2} 76% 84%)"/><stop offset="100%" stop-opacity="0" stop-color="hsl(${h2} 76% 84%)"/></radialGradient>
<radialGradient id="c" cx="50%" cy="88%"><stop offset="0%" stop-color="hsl(${h3} 72% 86%)"/><stop offset="100%" stop-opacity="0" stop-color="hsl(${h3} 72% 86%)"/></radialGradient>
</defs>
<rect width="1024" height="576" fill="#ffffff"/>
<rect width="1024" height="576" fill="url(#a)"/><rect width="1024" height="576" fill="url(#b)"/><rect width="1024" height="576" fill="url(#c)"/>
<g font-family="Inter,Segoe UI,sans-serif" fill="#111827">
<text x="56" y="470" font-size="30" font-weight="600">${esc(words)}</text>
<text x="56" y="508" font-size="17" fill="#6b7280">${esc(style)} · VisaMOTion</text>
</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** ক্লাউড ইঞ্জিন না থাকলে স্টাইল অনুযায়ী কাঠামোবদ্ধ বাংলা আর্ট ব্রিফ। */
function localBrief(prompt: string, style: string) {
  const light: Record<string, string> = {
    Photoreal: "নরম প্রাকৃতিক দিনের আলো, জানালার পাশ থেকে আসা ডিফিউজড আলো, হালকা ছায়া",
    Illustration: "সমতল প্যাস্টেল রঙ, কোনো কঠিন ছায়া নয়, নরম গ্রেডিয়েন্ট",
    Infographic: "সাদা ব্যাকগ্রাউন্ডে উজ্জ্বল সমান আলো, উচ্চ কনট্রাস্ট টেক্সট",
    "Document scan": "সরাসরি উপর থেকে সমান আলো, কোনো প্রতিফলন বা ছায়া নয়",
    "Social post": "উজ্জ্বল রঙ, শক্তিশালী কনট্রাস্ট, কেন্দ্রীভূত আলো",
    Minimal: "একদিকের নরম আলো, বিশাল খালি জায়গা, নিরপেক্ষ ধূসর টোন",
  };
  const comp: Record<string, string> = {
    Photoreal: "৫০ মিমি লেন্স, চোখের সমান উচ্চতা, ১৬:৯ অনুপাত, বিষয় এক-তৃতীয়াংশ নিয়মে",
    Illustration: "কেন্দ্রীভূত বিষয়, চারপাশে সমান মার্জিন, ১৬:৯ অনুপাত",
    Infographic: "উপরে শিরোনাম, মাঝে ধাপে ধাপে নম্বরযুক্ত ব্লক, নিচে সিটিএ",
    "Document scan": "A4 অনুপাত, পৃষ্ঠার প্রান্ত দৃশ্যমান, টেক্সট সম্পূর্ণ পাঠযোগ্য",
    "Social post": "১:১ বা ৪:৫ অনুপাত, উপরে বড় শিরোনাম, নিচে ব্র্যান্ড লোগোর জায়গা",
    Minimal: "একটি মাত্র বিষয়, ৭০% খালি জায়গা, প্রতিসম ফ্রেম",
  };
  return [
    `## ভিজ্যুয়াল ব্রিফ — ${style}`,
    ``,
    `### ১. মূল দৃশ্য`,
    `${prompt} — ভিসা পরামর্শ প্রতিষ্ঠানের পেশাদার প্রেক্ষাপটে উপস্থাপন করতে হবে। বিষয়বস্তু স্পষ্ট, পরিচ্ছন্ন এবং বিশ্বাসযোগ্য হবে।`,
    ``,
    `### ২. রঙ ও আলো`,
    `${light[style] ?? light.Photoreal}। প্রধান রঙ সাদা ও হালকা ধূসর, উচ্চারণ রঙ গাঢ় নীল বা কালো।`,
    ``,
    `### ৩. কম্পোজিশন`,
    `${comp[style] ?? comp.Photoreal}।`,
    ``,
    `### ৪. কী এড়াতে হবে`,
    `- বিকৃত হাত, মুখ বা লেখা`,
    `- ভুল বানান বা অস্পষ্ট টেক্সট`,
    `- অতিরিক্ত ফিল্টার, ওয়াটারমার্ক বা স্টক-ছবির ছাপ`,
    `- কোনো প্রকৃত দূতাবাস বা সরকারি সিলের নকল`,
    ``,
    `### পরবর্তী ধাপ`,
    `ছবিটি পছন্দ না হলে প্রম্পটে আরও নির্দিষ্ট বিবরণ যোগ করুন অথবা অন্য স্টাইল বেছে নিন।`,
  ].join("\n");
}

export async function GET() {
  return Response.json({ styles: IMAGE_STYLES });
}

export async function POST(request: Request) {
  const keys = readKeys(request);
  const body = (await request.json()) as { prompt?: string; style?: string; withBrief?: boolean };
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

  const style = body.style && (IMAGE_STYLES as readonly string[]).includes(body.style) ? body.style : "Photoreal";
  const seed = seedOf(`${prompt}|${style}`);

  const styleHint: Record<string, string> = {
    Photoreal: "photorealistic, natural daylight, 50mm lens, shallow depth of field",
    Illustration: "flat vector illustration, soft pastel palette, clean shapes",
    Infographic: "clean infographic layout, numbered steps, generous whitespace",
    "Document scan": "top-down flat scan of official paperwork, crisp typography",
    "Social post": "bold social media graphic, high contrast, centred subject",
    Minimal: "minimalist composition, single subject, plenty of negative space",
  };

  const enhanced = `${prompt}, ${styleHint[style]}, high detail, professional visa agency context`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=1024&height=576&seed=${seed % 100000}&nologo=true`;
  const fallback = buildSvg(prompt, style, seed);

  let brief = "";
  if (body.withBrief !== false) {
    const { text, source } = await complete(
      [
        { role: "system", content: "তুমি VisaMOTion-এর ভিজ্যুয়াল ডিরেক্টর। শুধু বাংলায় সংক্ষিপ্ত ব্রিফ লেখো। কোনো ভূমিকা বা আত্মপরিচয় নয়।" },
        { role: "user", content: `বিষয়: ${prompt}\nস্টাইল: ${style}\n\nচারটি ছোট অংশে ব্রিফ দাও: ১) মূল দৃশ্য, ২) রঙ ও আলো, ৩) কম্পোজিশন, ৪) কী এড়াতে হবে।` },
      ],
      "document-generation",
      keys,
    );
    brief = source === "internal-engine" ? localBrief(prompt, style) : text;
  }

  return Response.json({ ok: true, prompt, style, seed, url, fallback, brief }, { status: 201 });
}
