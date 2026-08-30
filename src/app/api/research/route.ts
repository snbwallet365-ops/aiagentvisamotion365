import { complete, readKeys } from "@/lib/llm";
import { COUNTRIES, getCountry } from "@/lib/visa-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Source { title: string; url: string; snippet: string; provider: string }

async function exaSearch(query: string, key?: string): Promise<Source[]> {
  if (!key) return [];
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        query,
        numResults: 5,
        type: "auto",
        contents: { text: { maxCharacters: 600 } },
      }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: { title?: string; url?: string; text?: string }[] };
    return (json.results ?? []).map((r) => ({
      title: r.title ?? "Untitled source",
      url: r.url ?? "",
      snippet: (r.text ?? "").slice(0, 500),
      provider: "exa-mcp",
    }));
  } catch {
    return [];
  }
}

function knowledgeSources(query: string): Source[] {
  const lower = query.toLowerCase();
  const matches = COUNTRIES.filter(
    (c) => lower.includes(c.country.toLowerCase()) || query.includes(c.countryBn) ||
      (c.country === "United Arab Emirates" && (lower.includes("uae") || query.includes("দুবাই"))),
  );
  const pool = matches.length ? matches : COUNTRIES.slice(0, 4);
  return pool.slice(0, 5).map((c) => ({
    title: `${c.countryBn} — সরকারি অভিবাসন পোর্টাল (${c.visaTypesBn[0]})`,
    url: c.portalUrl,
    snippet: `${c.highlightBn} ন্যূনতম তহবিল ${c.minimumBankBalance.toLocaleString("bn-BD")} ডলার সমতুল্য। ${c.visaTypesBn[0]}-এর সরকারি ফি আনুমানিক ${c.fees[c.visaTypes[0]].toLocaleString("bn-BD")} ${c.currency}। সাধারণ প্রসেসিং সময় ${c.processingDays[c.visaTypes[0]]} দিন। বিশেষ শর্ত: ${c.extraDocumentsBn.join("; ")}।`,
    provider: "internal-kb",
  }));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string; country?: string; model?: string };
  const query = (body.query ?? "").trim();
  if (!query) return Response.json({ error: "প্রশ্ন প্রয়োজন" }, { status: 400 });

  const keys = readKeys(request);
  const live = await exaSearch(query, keys.exa);
  const sources = live.length ? live : knowledgeSources(query + " " + (body.country ?? ""));

  const context = sources.map((s, i) => `[${i + 1}] ${s.title} (${s.url})\n${s.snippet}`).join("\n\n");
  const { text, source } = await complete(
    [
      { role: "system", content: "তুমি VisaMOTion-এর ভিসা নীতি গবেষক। শুধু বাংলায় উত্তর দাও। সূত্র উল্লেখ করো [১], [২] আকারে। কোনো মডেল বা প্রযুক্তির নাম বলবে না।" },
      { role: "user", content: `গবেষণার প্রশ্ন: ${query}\n\nসূত্রসমূহ:\n${context}\n\nচারটি অংশে উত্তর দাও: ১) মূল তথ্য, ২) প্রয়োজনীয়তার টেবিল, ৩) ঝুঁকি ও সাম্প্রতিক পরিবর্তন, ৪) বাংলাদেশি আবেদনকারীর জন্য করণীয়।` },
    ],
    "visa-policy-search",
    keys,
  );

  const rule = body.country ? getCountry(body.country) : undefined;
  const summary =
    source === "openrouter"
      ? text
      : [
          `## মূল তথ্য`,
          ...sources.map((s, i) => `- [${i + 1}] ${s.snippet.split("।")[0]}।`),
          ``,
          `## প্রয়োজনীয়তার সারসংক্ষেপ`,
          rule
            ? [
                `| বিষয় | তথ্য |`,
                `| --- | --- |`,
                `| দেশ | ${rule.countryBn} |`,
                `| ভিসার ধরন | ${rule.visaTypesBn.join(", ")} |`,
                `| ন্যূনতম তহবিল | ${rule.minimumBankBalance.toLocaleString("bn-BD")} ডলার সমতুল্য |`,
                `| মূল শর্ত | ${rule.highlightBn} |`,
              ].join("\n")
            : sources.map((s) => `- ${s.title}`).join("\n"),
          ``,
          `## ঝুঁকি ও সাম্প্রতিক পরিবর্তন`,
          `- নিয়োগকর্তার দিকের শর্ত আবেদনকারীর শর্তের চেয়ে বেশি ঘন ঘন বদলায় — প্রতি ৩০ দিনে অথরাইজেশন যাচাই করুন।`,
          `- অস্ট্রেলিয়া, ডেনমার্ক, জার্মানি ও নিউজিল্যান্ডে বেতনের ন্যূনতম সীমা প্রতিবছর বাড়ে।`,
          ``,
          `## বাংলাদেশি আবেদনকারীর করণীয়`,
          `- আগে স্পন্সরশিপ বা অথরাইজেশন নিশ্চিত করুন।`,
          `- এরপর আবেদনকারীর ডকুমেন্ট প্যাক গোছান।`,
          `- সবশেষে অটোমেশন পাতা থেকে দেশভিত্তিক ওয়ার্কফ্লো চালিয়ে আবেদন জমা ও ট্র্যাক করুন।`,
        ].join("\n");

  return Response.json({
    query,
    summary,
    sources,
    provider: live.length ? "exa-mcp" : "internal-kb",
    engine: source,
  });
}
