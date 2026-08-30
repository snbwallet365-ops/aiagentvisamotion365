import { buildCanvas, detectLang, type CanvasKind } from "@/lib/expert";
import { complete, readKeys } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const KINDS: CanvasKind[] = ["mindmap", "flowchart", "project", "decision"];

/** Deterministic branch scaffolds so a canvas is always produced, even offline. */
function scaffold(kind: CanvasKind, topic: string, bn: boolean): string[][] {
  const T = (b: string, e: string) => (bn ? b : e);

  if (kind === "flowchart") {
    return [[
      T("১. ট্রিগার — কী দিয়ে শুরু হয়", "1. Trigger — what starts the process"),
      T("২. ইনপুট সংগ্রহ ও যাচাই", "2. Collect and validate inputs"),
      T("৩. প্রধান প্রক্রিয়াকরণ ধাপ", "3. Core processing step"),
      T("৪. শর্ত পরীক্ষা — পাস নাকি ব্যর্থ", "4. Condition check — pass or fail"),
      T("৫. ব্যর্থ পথ: পুনঃচেষ্টা ও লগ", "5. Failure path: retry and log"),
      T("৬. আউটপুট তৈরি ও সংরক্ষণ", "6. Produce and store the output"),
      T("৭. বিজ্ঞপ্তি ও পর্যালোচনা", "7. Notify and review"),
    ]];
  }

  if (kind === "project") {
    return [[
      T("ধাপ ১ — সংজ্ঞা: স্কোপ ও সাফল্যের মেট্রিক", "Phase 1 — Define: scope and success metrics"),
      T("ধাপ ২ — ডিজাইন: কাঠামো ও প্রোটোটাইপ", "Phase 2 — Design: structure and prototype"),
      T("ধাপ ৩ — নির্মাণ: কার্যকর সংস্করণ", "Phase 3 — Build: working version"),
      T("ধাপ ৪ — যাচাই: টেস্ট ও সংশোধন", "Phase 4 — Validate: test and fix"),
      T("ধাপ ৫ — চালু: রিলিজ ও ডকুমেন্টেশন", "Phase 5 — Launch: release and documentation"),
      T("ধাপ ৬ — পর্যালোচনা: শেখা ও পরবর্তী চক্র", "Phase 6 — Review: learnings and next cycle"),
    ]];
  }

  if (kind === "decision") {
    return [
      [T("বিকল্প ক", "Option A"), T("সুবিধা", "Upside"), T("খরচ ও সময়", "Cost and time"), T("ঝুঁকি", "Risk")],
      [T("বিকল্প খ", "Option B"), T("সুবিধা", "Upside"), T("খরচ ও সময়", "Cost and time"), T("ঝুঁকি", "Risk")],
      [T("মানদণ্ড", "Criteria"), T("খরচ ২৫%", "Cost 25%"), T("সময় ২০%", "Time 20%"), T("গুণমান ২০%", "Quality 20%"), T("ঝুঁকি ১৫%", "Risk 15%")],
      [T("সিদ্ধান্ত", "Decision"), T("সুপারিশ", "Recommendation"), T("যা বদলে দেবে", "What would change it")],
    ];
  }

  return [
    [T("লক্ষ্য", "Objective"), T("সাফল্য কেমন দেখাবে", "What success looks like"), T("সময়সীমা", "Deadline")],
    [T("পাঠক ও স্টেকহোল্ডার", "Audience and stakeholders"), T("তারা কী জানে", "What they already know"), T("তারা কী চায়", "What they need")],
    [T("প্রয়োজনীয় ইনপুট", "Required inputs"), T("উৎস নথি", "Source documents"), T("অনুপস্থিত তথ্য", "Missing information")],
    [T("করণীয়", "Workstreams"), T("গবেষণা", "Research"), T("খসড়া", "Draft"), T("পর্যালোচনা", "Review")],
    [T("ঝুঁকি", "Risks"), T("নির্ভরতা", "Dependencies"), T("প্রশমন", "Mitigations")],
    [T("ডেলিভারেবল", "Deliverables"), T("ফরম্যাট", "Format"), T("গ্রহণযোগ্যতার মানদণ্ড", "Acceptance criteria")],
  ];
}

export async function GET() {
  return Response.json({ kinds: KINDS });
}

export async function POST(request: Request) {
  const keys = readKeys(request);
  const body = (await request.json()) as { topic?: string; kind?: CanvasKind };
  const topic = (body.topic ?? "").trim();
  if (!topic) return Response.json({ error: "topic is required" }, { status: 400 });

  const kind: CanvasKind = KINDS.includes(body.kind as CanvasKind) ? (body.kind as CanvasKind) : "mindmap";
  const bn = detectLang(topic) === "bn";
  let branches = scaffold(kind, topic, bn);

  // Try to enrich the scaffold with model-generated branches.
  try {
    const { text, source } = await complete(
      [
        {
          role: "system",
          content:
            "You output only a JSON array of arrays of short labels (max 6 words each). " +
            "The first item of each inner array is the branch title, the rest are its leaves. " +
            "Return between 4 and 6 branches. No prose, no markdown fences.",
        },
        { role: "user", content: `Build a ${kind} structure for: ${topic}. Write the labels in ${bn ? "Bangla" : "English"}.` },
      ],
      "planning",
      keys,
    );
    if (source !== "internal-engine") {
      const raw = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every((b) => Array.isArray(b) && b.length > 0)) {
        branches = (parsed as string[][]).slice(0, 6).map((b) => b.slice(0, 6).map((x) => String(x).slice(0, 70)));
      }
    }
  } catch { /* keep the deterministic scaffold */ }

  const canvas = buildCanvas(kind, topic, branches);
  return Response.json({
    ok: true,
    kind,
    topic,
    canvas,
    nodeCount: canvas.nodes.length,
    edgeCount: canvas.edges.length,
    filename: `${topic.replace(/[^\p{L}\p{N} ]/gu, "").trim().replace(/\s+/g, "-").slice(0, 50) || "canvas"}.canvas`,
  }, { status: 201 });
}
