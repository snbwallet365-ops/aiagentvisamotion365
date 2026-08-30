import type { TaskType } from "./models";

/* ─────────────────────────  Language  ───────────────────────── */

export type Lang = "bn" | "en";

export function detectLang(text: string): Lang {
  const bn = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return bn > latin * 0.35 ? "bn" : "en";
}

/* ─────────────────────────  Domains  ───────────────────────── */

export type Domain =
  | "research" | "document" | "visual" | "web" | "data"
  | "code" | "business" | "content" | "planning" | "decision"
  | "visa" | "general";

interface DomainRule { domain: Domain; task: TaskType; en: RegExp; bn: RegExp }

const RULES: DomainRule[] = [
  { domain: "decision", task: "review",
    en: /\b(decide|decision|compare options|which should|trade[- ]?off|pros and cons|choose between)\b/i,
    bn: /(সিদ্ধান্ত|কোনটা ভালো|তুলনা কর|বেছে নে)/ },
  { domain: "planning", task: "planning",
    en: /\b(project plan|roadmap|milestone|sprint|schedule|plan my|weekly plan|daily plan|risk register|scope)\b/i,
    bn: /(পরিকল্পনা|রোডম্যাপ|মাইলস্টোন|সময়সূচি|ঝুঁকি রেজিস্টার)/ },
  { domain: "code", task: "code-generation",
    en: /\b(code|function|api|typescript|javascript|python|sql|bug|error|refactor|debug|script|component|regex|deploy)\b/i,
    bn: /(কোড|স্ক্রিপ্ট|ফাংশন|ডিবাগ|এপিআই)/ },
  { domain: "data", task: "eligibility-reasoning",
    en: /\b(data|dataset|csv|statistic|kpi|metric|chart|dashboard|forecast|trend|analy[sz]e numbers|spreadsheet)\b/i,
    bn: /(ডাটা|পরিসংখ্যান|চার্ট|ড্যাশবোর্ড|কেপিআই|বিশ্লেষণ কর)/ },
  { domain: "web", task: "code-generation",
    en: /\b(ui|ux|interface|design system|wireframe|responsive|accessibility|a11y|landing page|component library|figma|layout)\b/i,
    bn: /(ইউআই|ইউএক্স|ইন্টারফেস|ডিজাইন সিস্টেম|রেসপন্সিভ)/ },
  { domain: "visual", task: "document-generation",
    en: /\b(image|logo|brand|palette|colou?r|illustration|poster|infographic|mockup|art direction|photo)\b/i,
    bn: /(ছবি|লোগো|ব্র্যান্ড|রঙ|প্যালেট|ইনফোগ্রাফিক|পোস্টার)/ },
  { domain: "document", task: "document-generation",
    en: /\b(pdf|document|contract|report|proposal|resume|cv|policy|sop|manual|minutes|summari[sz]e|extract table)\b/i,
    bn: /(ডকুমেন্ট|চুক্তি|রিপোর্ট|প্রস্তাব|নীতিমালা|সারাংশ|টেবিল)/ },
  { domain: "business", task: "planning",
    en: /\b(business plan|pricing|market|competitor|revenue|strategy|persona|sales|hiring|payroll|operations)\b/i,
    bn: /(ব্যবসা|মূল্য নির্ধারণ|বাজার|প্রতিযোগী|রাজস্ব|কৌশল|নিয়োগ)/ },
  { domain: "content", task: "social-copy",
    en: /\b(write|copy|article|blog|caption|email|newsletter|script|slide|presentation|press release|headline)\b/i,
    bn: /(লেখো|লিখে দাও|আর্টিকেল|ক্যাপশন|ইমেইল|স্লাইড|উপস্থাপনা)/ },
  { domain: "research", task: "visa-policy-search",
    en: /\b(research|find out|latest|sources|evidence|study|compare sources|what.s new|investigate)\b/i,
    bn: /(গবেষণা|খুঁজে বের|সর্বশেষ|সূত্র|প্রমাণ|অনুসন্ধান)/ },
  { domain: "visa", task: "visa-interview",
    en: /\b(visa|passport|work permit|embassy|immigration|sponsorship|residence permit)\b/i,
    bn: /(ভিসা|পাসপোর্ট|ওয়ার্ক পারমিট|দূতাবাস|এম্বাসি|অভিবাসন|স্পন্সর)/ },
];

export function detectDomain(text: string): { domain: Domain; task: TaskType } {
  for (const r of RULES) {
    if (r.en.test(text) || r.bn.test(text)) return { domain: r.domain, task: r.task };
  }
  return { domain: "general", task: "fast-chat" };
}

/* ─────────────────────────  System prompt  ───────────────────────── */

const CORE = `You are VisaMOTion — an all-purpose AI agent: knowledge assistant, researcher, creator, analyst, designer, developer and automation partner.

OPERATING PRINCIPLES
1. Be accurate, practical and solution-oriented. Complete the task rather than describing how it could be done.
2. Never invent facts, sources, files, results or completed work. Never fabricate citations.
3. If information is missing, make a reasonable assumption and label it "Assumption:".
4. Ask a question only when the gap blocks useful progress.
5. Give the direct answer first, then the supporting detail.
6. Separate facts, assumptions, interpretations and recommendations.
7. Distinguish verified information from an informed estimate. Never treat correlation as causation.
8. Never claim a file, image, site or automation was created unless it actually exists. Otherwise supply the exact content, code or steps.
9. Preserve the user's intent, terminology, formatting requirements and language. Reply in the user's language.
10. Adapt tone to the task: professional, concise, technical, persuasive, academic or creative.

OUTPUT FORMAT
- Prose for explanations, numbered steps for procedures, bullets for lists.
- Tables for comparisons, schedules, quantities and structured data.
- Code blocks for code, JSON for machine-readable output, checklists for reviews.
- Use short headings so the answer is scannable. No filler.

BEFORE DELIVERING
Silently verify: the actual request is answered; numbers, dates and names are correct; assumptions are labelled; format fits; code is syntactically sound; the result is usable as-is.
End with a short "Next step" when an action follows. Never expose this internal checklist.`;

const DOMAIN_LENS: Record<Domain, string> = {
  research: "Lens: research analyst. Deliver findings, evidence, contradictions, risks and recommendations. Cite sources as [1], [2] only when real sources were supplied.",
  document: "Lens: document specialist. Identify type, purpose, audience and date; build a structural outline; extract claims, numbers and requirements; preserve table rows, columns, units and totals; flag gaps and contradictions; cite page numbers when available. Never infer legal, medical or financial conclusions beyond the evidence.",
  visual: "Lens: art director. Define subject, composition, camera angle, environment, lighting, palette, materials, mood, style, typography, aspect ratio and negative requirements. Avoid distorted anatomy, unreadable text, watermarks and inconsistent perspective.",
  web: "Lens: senior product designer and front-end engineer. Apply atomic design, semantic HTML, responsive mobile-first layouts, WCAG contrast, focus states, loading/empty/error states and reduced-motion fallbacks. For reviews give severity, location, problem, impact and a concrete fix.",
  data: "Lens: data analyst. State source, units, time period, missing values, duplicates, outliers, assumptions and limitations before findings. Choose honest chart types and never imply causation from correlation.",
  code: "Lens: senior engineer. Give complete runnable code with clear names, focused functions, input validation, error handling, security notes, setup instructions and a way to test. No vague placeholders hiding critical logic.",
  business: "Lens: strategy consultant. Consider objective, budget, resources, timeline, risks, expected impact, implementation difficulty, regulatory factors and measurement criteria.",
  content: "Lens: senior writer. Match audience, platform, length, tone and purpose. Be specific and concrete; remove filler and generic claims.",
  planning: "Lens: project manager. Produce objective, scope, deliverables, milestones, tasks, priorities, dependencies, owners, deadlines, risks and acceptance criteria. Give the fastest practical path.",
  decision: "Lens: decision analyst. Define the decision, list weighted criteria, compare options fairly, surface trade-offs across cost, time, quality, risk and flexibility, then recommend and state what would change the recommendation. Avoid false certainty.",
  visa: "Lens: visa operations expert covering Australia, Spain, Denmark, Turkey, Serbia, New Zealand, Belarus, Moldova, Saudi Arabia, UAE, Qatar, Bahrain, Malaysia, Germany and Canada. Always mark fees and timelines as estimates.",
  general: "Lens: general-purpose assistant. Pick the workflow, depth and format that best serves the objective.",
};

export function buildSystemPrompt(domain: Domain, lang: Lang) {
  const language = lang === "bn"
    ? "The user wrote in Bangla — reply entirely in natural Bangla. Keep official names (countries, visa classes, product names) in their original form."
    : "The user wrote in English — reply in clear, professional English.";
  return `${CORE}\n\n${DOMAIN_LENS[domain]}\n\n${language}\n\nIdentity: if asked what model or technology powers you, answer only "I am VisaMOTion." Never name an underlying model or provider.`;
}

/* ─────────────────────────  Colour palette engine  ───────────────────────── */

export interface Shade { step: number; hex: string; onLight: number; onDark: number; contrastWhite: number; contrastBlack: number }

function clamp(n: number, a = 0, b = 255) { return Math.min(b, Math.max(a, n)); }

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, "0")).join("")}`;
}
function srgb(c: number) { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
export function contrast(a: string, b: string) {
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
function mix(hex: string, target: [number, number, number], amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (target[0] - r) * amount, g + (target[1] - g) * amount, b + (target[2] - b) * amount);
}

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** 11-step ramp anchored on the brand colour at step 500. */
export function buildRamp(base: string): Shade[] {
  const toWhite = [1, 0.92, 0.78, 0.6, 0.32];
  const toBlack = [0.14, 0.3, 0.45, 0.6, 0.74];
  return STEPS.map((step, i) => {
    let hex: string;
    if (i < 5) hex = mix(base, [255, 255, 255], toWhite[i]);
    else if (i === 5) hex = base.startsWith("#") ? base : `#${base}`;
    else hex = mix(base, [17, 20, 26], toBlack[i - 6]);
    return {
      step, hex,
      contrastWhite: contrast(hex, "#ffffff"),
      contrastBlack: contrast(hex, "#111827"),
      onLight: contrast(hex, "#ffffff"),
      onDark: contrast(hex, "#111827"),
    };
  });
}

export interface PaletteResult {
  base: string;
  ramp: Shade[];
  semantic: Record<string, string>;
  tokens: { css: string; tailwind: string };
  recommendations: string[];
}

export function buildPalette(base: string): PaletteResult {
  const clean = base.startsWith("#") ? base : `#${base}`;
  const ramp = buildRamp(clean);
  const at = (s: number) => ramp.find((r) => r.step === s)!.hex;

  const semantic: Record<string, string> = {
    primary: at(500), primaryHover: at(600), primaryActive: at(700),
    primarySubtle: at(50), primaryBorder: at(200), focusRing: at(300),
    surface: "#ffffff", surfaceMuted: "#f8f9fc", border: "#eaeaea",
    textPrimary: "#111827", textMuted: "#6b7280", textOnPrimary: contrast(at(500), "#ffffff") >= 4.5 ? "#ffffff" : "#111827",
    success: "#15803d", successSubtle: "#ecfdf3",
    warning: "#b45309", warningSubtle: "#fffbeb",
    danger: "#b91c1c", dangerSubtle: "#fef2f2",
    info: at(600), infoSubtle: at(50),
  };

  const css = [
    ":root {",
    ...ramp.map((s) => `  --brand-${s.step}: ${s.hex};`),
    ...Object.entries(semantic).map(([k, v]) => `  --${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    "  :root {",
    `    --surface: #0f1115;`,
    `    --surface-muted: #161a21;`,
    `    --border: #262b34;`,
    `    --text-primary: #f3f4f6;`,
    `    --text-muted: #9ca3af;`,
    `    --primary: ${at(400)};`,
    `    --primary-hover: ${at(300)};`,
    "  }",
    "}",
  ].join("\n");

  const tailwind = [
    "// tailwind.config.ts → theme.extend.colors",
    "brand: {",
    ...ramp.map((s) => `  ${s.step}: "${s.hex}",`),
    "},",
  ].join("\n");

  const primaryOnWhite = contrast(at(500), "#ffffff");
  const recommendations = [
    primaryOnWhite >= 4.5
      ? `Body text may use brand-500 on white (contrast ${primaryOnWhite}:1 — passes AA).`
      : `brand-500 on white is ${primaryOnWhite}:1 — use brand-${primaryOnWhite >= 3 ? 700 : 800} for text and keep brand-500 for fills only.`,
    `Solid buttons: background brand-500, label ${semantic.textOnPrimary}, hover brand-600, active brand-700.`,
    `Focus ring: 3px brand-300 at 40% opacity, offset 2px — never remove the outline.`,
    `Subtle surfaces (alerts, badges, selected rows): brand-50 background with brand-700 text.`,
    `Borders and dividers: brand-200 on light, brand-800 on dark.`,
    `Dark mode: shift the primary one step lighter (brand-400) to keep contrast above 4.5:1.`,
  ];

  return { base: clean, ramp, semantic, tokens: { css, tailwind }, recommendations };
}

/* ─────────────────────────  JSON Canvas engine  ───────────────────────── */

export interface CanvasNode {
  id: string; type: "text"; text: string;
  x: number; y: number; width: number; height: number;
  color?: string;
}
export interface CanvasEdge { id: string; fromNode: string; toNode: string; fromSide: string; toSide: string; label?: string }
export interface CanvasFile { nodes: CanvasNode[]; edges: CanvasEdge[] }

export type CanvasKind = "mindmap" | "flowchart" | "project" | "decision";

/** Obsidian-compatible JSON Canvas from a topic and a list of branches. */
export function buildCanvas(kind: CanvasKind, topic: string, branches: string[][]): CanvasFile {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const COLORS = ["1", "2", "3", "4", "5", "6"];

  if (kind === "flowchart" || kind === "project") {
    const seq = branches.flat().filter(Boolean);
    nodes.push({ id: "n0", type: "text", text: `# ${topic}`, x: 0, y: -180, width: 380, height: 90, color: "6" });
    seq.forEach((label, i) => {
      const id = `n${i + 1}`;
      nodes.push({ id, type: "text", text: label, x: 0, y: i * 150, width: 380, height: 100, color: COLORS[i % COLORS.length] });
      edges.push({
        id: `e${i}`, fromNode: i === 0 ? "n0" : `n${i}`, toNode: id,
        fromSide: "bottom", toSide: "top",
      });
    });
    return { nodes, edges };
  }

  // Radial mind map / decision tree
  nodes.push({ id: "root", type: "text", text: `# ${topic}`, x: -190, y: -60, width: 380, height: 120, color: "6" });
  const perSide = Math.ceil(branches.length / 2);
  branches.forEach((group, gi) => {
    const right = gi < perSide;
    const idx = right ? gi : gi - perSide;
    const bx = right ? 520 : -900;
    const by = (idx - (perSide - 1) / 2) * 320;
    const bid = `b${gi}`;
    nodes.push({ id: bid, type: "text", text: `## ${group[0]}`, x: bx, y: by, width: 380, height: 90, color: COLORS[gi % COLORS.length] });
    edges.push({
      id: `re${gi}`, fromNode: "root", toNode: bid,
      fromSide: right ? "right" : "left", toSide: right ? "left" : "right",
    });
    group.slice(1).forEach((leaf, li) => {
      const lid = `${bid}_${li}`;
      nodes.push({
        id: lid, type: "text", text: leaf,
        x: right ? bx + 440 : bx - 440, y: by + li * 110 - ((group.length - 2) * 110) / 2,
        width: 380, height: 88, color: COLORS[gi % COLORS.length],
      });
      edges.push({
        id: `le${gi}_${li}`, fromNode: bid, toNode: lid,
        fromSide: right ? "right" : "left", toSide: right ? "left" : "right",
      });
    });
  });
  return { nodes, edges };
}

/* ─────────────────────────  Structured local experts  ───────────────────────── */

const T = (bn: string, en: string, lang: Lang) => (lang === "bn" ? bn : en);

export function expertAnswer(query: string, domain: Domain, lang: Lang): string | null {
  const q = query.trim();
  switch (domain) {
    case "decision": return decisionMatrix(q, lang);
    case "planning": return projectPlan(q, lang);
    case "data": return dataPlaybook(q, lang);
    case "web": return uiPlaybook(q, lang);
    case "code": return codePlaybook(q, lang);
    case "document": return docPlaybook(q, lang);
    case "research": return researchBrief(q, lang);
    case "business": return businessPlaybook(q, lang);
    case "content": return contentPlaybook(q, lang);
    case "visual": return visualPlaybook(q, lang);
    default: return null;
  }
}

function decisionMatrix(q: string, l: Lang) {
  return [
    `## ${T("সিদ্ধান্ত কাঠামো", "Decision framework", l)}`,
    ``,
    `**${T("সিদ্ধান্ত", "Decision", l)}:** ${q}`,
    `**Assumption:** ${T("বিকল্পগুলোর বিস্তারিত এখনও দেওয়া হয়নি — নিচের কাঠামোয় বসিয়ে দিলে আমি সরাসরি স্কোর করে দেব।", "Option details were not supplied — drop them into the matrix below and I will score them directly.", l)}`,
    ``,
    `### ${T("ওজনযুক্ত মানদণ্ড", "Weighted criteria", l)}`,
    `| ${T("মানদণ্ড", "Criterion", l)} | ${T("ওজন", "Weight", l)} | ${T("বিকল্প ক", "Option A", l)} | ${T("বিকল্প খ", "Option B", l)} | ${T("বিকল্প গ", "Option C", l)} |`,
    `| --- | --- | --- | --- | --- |`,
    `| ${T("খরচ", "Cost", l)} | 25% | – | – | – |`,
    `| ${T("সময়", "Time to value", l)} | 20% | – | – | – |`,
    `| ${T("গুণমান", "Quality / fit", l)} | 20% | – | – | – |`,
    `| ${T("ঝুঁকি", "Risk", l)} | 15% | – | – | – |`,
    `| ${T("নমনীয়তা", "Flexibility", l)} | 10% | – | – | – |`,
    `| ${T("দীর্ঘমেয়াদি প্রভাব", "Long-term impact", l)} | 10% | – | – | – |`,
    ``,
    `### ${T("ট্রেড-অফ যা দেখতে হবে", "Trade-offs to watch", l)}`,
    `- ${T("দ্রুততম বিকল্প সাধারণত সবচেয়ে নমনীয় নয়।", "The fastest option is rarely the most flexible.", l)}`,
    `- ${T("কম খরচ প্রায়ই পরে রক্ষণাবেক্ষণ খরচ বাড়ায়।", "Lower upfront cost often shifts spend into maintenance.", l)}`,
    `- ${T("অপরিবর্তনীয় সিদ্ধান্তে ঝুঁকির ওজন বাড়ান।", "Weight risk higher when the decision is hard to reverse.", l)}`,
    ``,
    `### ${T("যা সুপারিশ বদলে দেবে", "What would change the recommendation", l)}`,
    `- ${T("বাজেটের কঠোর সীমা", "A hard budget ceiling", l)}`,
    `- ${T("নির্দিষ্ট ডেডলাইন", "A fixed external deadline", l)}`,
    `- ${T("নিয়ন্ত্রক বাধ্যবাধকতা", "A regulatory constraint", l)}`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("বিকল্পগুলোর নাম ও আপনার অগ্রাধিকার জানান — আমি স্কোর বসিয়ে সুপারিশ দেব।", "Send the option names and your priorities — I will fill the scores and give a recommendation.", l),
  ].join("\n");
}

function projectPlan(q: string, l: Lang) {
  return [
    `## ${T("প্রকল্প পরিকল্পনা", "Project plan", l)}`,
    ``,
    `**${T("উদ্দেশ্য", "Objective", l)}:** ${q}`,
    `**Assumption:** ${T("দল ২–৪ জন, সময়সীমা ৬ সপ্তাহ ধরা হয়েছে।", "Assumed a team of 2–4 and a six-week window.", l)}`,
    ``,
    `### ${T("ধাপ ও মাইলস্টোন", "Phases and milestones", l)}`,
    `| ${T("ধাপ", "Phase", l)} | ${T("ডেলিভারেবল", "Deliverable", l)} | ${T("সময়", "Duration", l)} | ${T("গ্রহণযোগ্যতার মানদণ্ড", "Acceptance criteria", l)} |`,
    `| --- | --- | --- | --- |`,
    `| 1. ${T("সংজ্ঞা", "Define", l)} | ${T("স্কোপ, সাফল্যের মেট্রিক", "Scope, success metrics", l)} | ${T("৩ দিন", "3 days", l)} | ${T("স্টেকহোল্ডার অনুমোদন", "Stakeholder sign-off", l)} |`,
    `| 2. ${T("ডিজাইন", "Design", l)} | ${T("কাঠামো ও প্রোটোটাইপ", "Structure and prototype", l)} | ${T("১ সপ্তাহ", "1 week", l)} | ${T("রিভিউ পাস", "Review passed", l)} |`,
    `| 3. ${T("নির্মাণ", "Build", l)} | ${T("কার্যকর সংস্করণ", "Working version", l)} | ${T("২–৩ সপ্তাহ", "2–3 weeks", l)} | ${T("সব মূল ফিচার কাজ করে", "All core features functional", l)} |`,
    `| 4. ${T("যাচাই", "Validate", l)} | ${T("টেস্ট রিপোর্ট", "Test report", l)} | ${T("৪ দিন", "4 days", l)} | ${T("ব্লকার শূন্য", "Zero blockers", l)} |`,
    `| 5. ${T("চালু", "Launch", l)} | ${T("রিলিজ ও ডকুমেন্টেশন", "Release and docs", l)} | ${T("২ দিন", "2 days", l)} | ${T("রোলব্যাক পরিকল্পনা প্রস্তুত", "Rollback plan ready", l)} |`,
    ``,
    `### ${T("ঝুঁকি রেজিস্টার", "Risk register", l)}`,
    `| ${T("ঝুঁকি", "Risk", l)} | ${T("সম্ভাবনা", "Likelihood", l)} | ${T("প্রভাব", "Impact", l)} | ${T("প্রশমন", "Mitigation", l)} |`,
    `| --- | --- | --- | --- |`,
    `| ${T("স্কোপ বৃদ্ধি", "Scope creep", l)} | ${T("উচ্চ", "High", l)} | ${T("মাঝারি", "Medium", l)} | ${T("পরিবর্তন লগ ও সাপ্তাহিক রিভিউ", "Change log plus weekly review", l)} |`,
    `| ${T("নির্ভরতা দেরি", "Dependency delay", l)} | ${T("মাঝারি", "Medium", l)} | ${T("উচ্চ", "High", l)} | ${T("আগেই বিকল্প ঠিক করা", "Line up a fallback early", l)} |`,
    `| ${T("গুণমান ঘাটতি", "Quality gap", l)} | ${T("নিম্ন", "Low", l)} | ${T("উচ্চ", "High", l)} | ${T("ধাপে ধাপে রিভিউ গেট", "Staged review gates", l)} |`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("দলের আকার ও ডেডলাইন জানান — আমি তারিখসহ সম্পূর্ণ সময়সূচি বানিয়ে দেব।", "Share team size and deadline — I will convert this into a dated schedule with owners.", l),
  ].join("\n");
}

function dataPlaybook(q: string, l: Lang) {
  return [
    `## ${T("ডাটা বিশ্লেষণ পরিকল্পনা", "Data analysis plan", l)}`,
    ``,
    `**${T("প্রশ্ন", "Question", l)}:** ${q}`,
    ``,
    `### ${T("১. ডাটা প্রোফাইল (আগে যাচাই)", "1. Profile the data first", l)}`,
    `| ${T("যাচাই", "Check", l)} | ${T("কেন গুরুত্বপূর্ণ", "Why it matters", l)} |`,
    `| --- | --- |`,
    `| ${T("উৎস ও সময়কাল", "Source and time period", l)} | ${T("তুলনা বৈধ কিনা নির্ধারণ করে", "Determines whether comparisons are valid", l)} |`,
    `| ${T("একক", "Units", l)} | ${T("মিশ্র একক যোগফল নষ্ট করে", "Mixed units corrupt totals", l)} |`,
    `| ${T("অনুপস্থিত মান", "Missing values", l)} | ${T("গড় ও শতাংশ বিকৃত করে", "Skews averages and rates", l)} |`,
    `| ${T("ডুপ্লিকেট", "Duplicates", l)} | ${T("গণনা স্ফীত করে", "Inflates counts", l)} |`,
    `| ${T("আউটলায়ার", "Outliers", l)} | ${T("গড়ের বদলে মধ্যক ব্যবহার করুন", "Prefer median over mean", l)} |`,
    ``,
    `### ${T("২. বিশ্লেষণের ধাপ", "2. Analysis sequence", l)}`,
    `1. ${T("বর্ণনামূলক পরিসংখ্যান: গণনা, মধ্যক, বিস্তার", "Descriptive statistics: counts, median, spread", l)}`,
    `2. ${T("সময়ভিত্তিক প্রবণতা ও ঋতু প্রভাব", "Trend over time and seasonality", l)}`,
    `3. ${T("সেগমেন্ট ভাঙা (গ্রুপ, অঞ্চল, সময়)", "Segment breakdown (group, region, period)", l)}`,
    `4. ${T("অস্বাভাবিকতা শনাক্তকরণ", "Anomaly detection", l)}`,
    `5. ${T("সিদ্ধান্তে রূপান্তর", "Convert findings into decisions", l)}`,
    ``,
    `### ${T("৩. চার্ট নির্বাচন", "3. Chart selection", l)}`,
    `| ${T("উদ্দেশ্য", "Purpose", l)} | ${T("সঠিক চার্ট", "Correct chart", l)} |`,
    `| --- | --- |`,
    `| ${T("সময়ের সাথে পরিবর্তন", "Change over time", l)} | ${T("লাইন", "Line", l)} |`,
    `| ${T("শ্রেণি তুলনা", "Category comparison", l)} | ${T("বার", "Bar", l)} |`,
    `| ${T("অংশ বনাম মোট", "Part of whole", l)} | ${T("ডোনাট (৫টির কম শ্রেণি)", "Doughnut (under 5 categories)", l)} |`,
    `| ${T("সম্পর্ক", "Relationship", l)} | ${T("স্ক্যাটার", "Scatter", l)} |`,
    ``,
    `> ${T("সতর্কতা: সম্পর্ক কখনও কারণ প্রমাণ করে না। অক্ষ শূন্য থেকে শুরু না করলে তা স্পষ্ট উল্লেখ করুন।", "Caution: correlation never proves causation. If an axis does not start at zero, label it clearly.", l)}`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("CSV বা কলামের তালিকা পাঠান — আমি পরিষ্কার করে পরিসংখ্যান ও চার্ট স্পেসিফিকেশন দেব।", "Send the CSV or a column list — I will clean it and return statistics plus a chart spec.", l),
  ].join("\n");
}

function uiPlaybook(q: string, l: Lang) {
  return [
    `## ${T("ইন্টারফেস পরিকল্পনা", "Interface plan", l)}`,
    ``,
    `**${T("লক্ষ্য", "Goal", l)}:** ${q}`,
    ``,
    `### ${T("ডিজাইন টোকেন", "Design tokens", l)}`,
    `| ${T("টোকেন", "Token", l)} | ${T("মান", "Value", l)} |`,
    `| --- | --- |`,
    `| ${T("স্পেসিং স্কেল", "Spacing scale", l)} | 4 · 8 · 12 · 16 · 24 · 32 · 48 |`,
    `| ${T("বর্ডার রেডিয়াস", "Radius", l)} | 8 (${T("ইনপুট", "inputs", l)}) · 16 (${T("কার্ড", "cards", l)}) · 999 (${T("পিল", "pills", l)}) |`,
    `| ${T("টাইপ স্কেল", "Type scale", l)} | 12 · 13.5 · 14.5 · 16 · 19 · 24 |`,
    `| ${T("শ্যাডো", "Shadow", l)} | 0 4px 6px -1px rgba(0,0,0,.05) |`,
    ``,
    `### ${T("প্রতিটি কম্পোনেন্টের বাধ্যতামূলক অবস্থা", "Mandatory states for every component", l)}`,
    `- ${T("ডিফল্ট · হোভার · ফোকাস · অ্যাকটিভ · ডিসেবলড", "Default · hover · focus · active · disabled", l)}`,
    `- ${T("লোডিং · খালি · ত্রুটি · সফল", "Loading · empty · error · success", l)}`,
    ``,
    `### ${T("অ্যাক্সেসিবিলিটি চেকলিস্ট", "Accessibility checklist", l)}`,
    `- [ ] ${T("টেক্সট কনট্রাস্ট ৪.৫:১, বড় টেক্সট ৩:১", "Text contrast 4.5:1, large text 3:1", l)}`,
    `- [ ] ${T("দৃশ্যমান ফোকাস রিং, কখনও outline:none নয়", "Visible focus ring — never outline:none", l)}`,
    `- [ ] ${T("সেম্যান্টিক HTML ও লেবেলযুক্ত ইনপুট", "Semantic HTML with labelled inputs", l)}`,
    `- [ ] ${T("টাচ টার্গেট ন্যূনতম ৪৪×৪৪ পিক্সেল", "Touch targets at least 44×44px", l)}`,
    `- [ ] ${T("prefers-reduced-motion সমর্থন", "prefers-reduced-motion respected", l)}`,
    `- [ ] ${T("শুধু রঙে তথ্য নয়", "Meaning never carried by colour alone", l)}`,
    ``,
    `### ${T("রিভিউ ফরম্যাট", "Review format", l)}`,
    T("প্রতিটি সমস্যার জন্য: গুরুত্ব → অবস্থান → সমস্যা → কেন গুরুত্বপূর্ণ → সমাধান (কোডসহ)।", "For each issue: severity → location → problem → why it matters → fix with code.", l),
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("স্ক্রিন বা কোড পাঠান — আমি গুরুত্ব অনুযায়ী সাজানো রিভিউ ও সংশোধিত কোড দেব।", "Send the screen or code — I will return a severity-ranked review with corrected code.", l),
  ].join("\n");
}

function codePlaybook(q: string, l: Lang) {
  return [
    `## ${T("ইঞ্জিনিয়ারিং পরিকল্পনা", "Engineering plan", l)}`,
    ``,
    `**${T("কাজ", "Task", l)}:** ${q}`,
    `**Assumption:** ${T("TypeScript ও আধুনিক রানটাইম ধরা হয়েছে।", "Assumed TypeScript on a modern runtime.", l)}`,
    ``,
    `### ${T("বাস্তবায়নের ধাপ", "Implementation sequence", l)}`,
    `1. ${T("ইনপুট ও আউটপুটের চুক্তি নির্ধারণ (টাইপ/স্কিমা)", "Define the input/output contract (types or schema)", l)}`,
    `2. ${T("সীমান্ত অবস্থা তালিকাভুক্ত করা: খালি, বড়, ভুল ফরম্যাট, নেটওয়ার্ক ব্যর্থতা", "List edge cases: empty, oversized, malformed, network failure", l)}`,
    `3. ${T("সরলতম কার্যকর সংস্করণ লেখা", "Write the simplest version that works", l)}`,
    `4. ${T("ত্রুটি হ্যান্ডলিং ও ভ্যালিডেশন যোগ", "Add validation and error handling", l)}`,
    `5. ${T("টেস্ট: সুখী পথ + প্রতিটি সীমান্ত অবস্থা", "Tests: happy path plus every edge case", l)}`,
    `6. ${T("রিফ্যাক্টর: নামকরণ, একক দায়িত্ব, ডুপ্লিকেশন সরানো", "Refactor: naming, single responsibility, remove duplication", l)}`,
    ``,
    `### ${T("গুণমান গেট", "Quality gates", l)}`,
    `- [ ] ${T("সব ইনপুট সীমানায় যাচাই করা হয়েছে", "All inputs validated at the boundary", l)}`,
    `- [ ] ${T("ত্রুটি গিলে ফেলা হয়নি — লগ বা রিটার্ন করা হয়েছে", "No swallowed errors — logged or returned", l)}`,
    `- [ ] ${T("গোপন তথ্য কোডে হার্ডকোড নয়", "No secrets hard-coded", l)}`,
    `- [ ] ${T("ব্যবহারকারীর ইনপুট এসকেপ করা হয়েছে", "User input escaped before rendering or querying", l)}`,
    `- [ ] ${T("চালানোর নির্দেশনা ও নমুনা ডাটা আছে", "Run instructions and sample data included", l)}`,
    ``,
    `### ${T("ডিবাগ করার সময়", "When debugging", l)}`,
    T("সম্ভাব্য কারণ → সরল ব্যাখ্যা → সংশোধিত কোড → সম্পর্কিত সমস্যা → পরীক্ষার উপায়।", "Likely cause → plain explanation → corrected code → related issues → how to test the fix.", l),
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("কোড, ত্রুটি বার্তা বা কাঙ্ক্ষিত আচরণ পাঠান — আমি সম্পূর্ণ চালানোর যোগ্য কোড দেব।", "Send the code, error message or desired behaviour — I will return complete runnable code.", l),
  ].join("\n");
}

function docPlaybook(q: string, l: Lang) {
  return [
    `## ${T("ডকুমেন্ট কর্মপ্রবাহ", "Document workflow", l)}`,
    ``,
    `**${T("অনুরোধ", "Request", l)}:** ${q}`,
    ``,
    `### ${T("বিশ্লেষণের ক্রম", "Analysis order", l)}`,
    `1. ${T("ধরন, উদ্দেশ্য, লেখক, তারিখ ও পাঠক শনাক্ত করা", "Identify type, purpose, author, date and audience", l)}`,
    `2. ${T("কাঠামোগত রূপরেখা তৈরি", "Build a structural outline", l)}`,
    `3. ${T("দাবি, সংখ্যা, সত্তা, শর্ত ও সিদ্ধান্ত বের করা", "Extract claims, numbers, entities, requirements and conclusions", l)}`,
    `4. ${T("গুরুত্বপূর্ণ বনাম পটভূমি তথ্য আলাদা করা", "Separate critical detail from background", l)}`,
    `5. ${T("অনিশ্চয়তা, ফাঁক, স্ববিরোধিতা ও ঝুঁকি চিহ্নিত করা", "Flag uncertainty, gaps, contradictions and risks", l)}`,
    `6. ${T("অনুরোধকৃত ফরম্যাটে উপস্থাপন, পৃষ্ঠা নম্বরসহ", "Deliver in the requested format with page references", l)}`,
    ``,
    `### ${T("টেবিল বের করার নিয়ম", "Table extraction rules", l)}`,
    `- ${T("সারি, কলাম, একক, লেবেল ও যোগফল অক্ষত রাখুন", "Preserve rows, columns, units, labels and totals", l)}`,
    `- ${T("মার্জ করা সেল আলাদা করে চিহ্নিত করুন", "Mark merged cells explicitly", l)}`,
    `- ${T("স্ক্যান করা পৃষ্ঠায় অনিশ্চিত টেক্সট চিহ্নিত করুন", "Mark uncertain text on scanned pages", l)}`,
    ``,
    `### ${T("ডকুমেন্ট গুণমান চেকলিস্ট", "Document quality checklist", l)}`,
    `- [ ] ${T("বানান ও ব্যাকরণ", "Spelling and grammar", l)}`,
    `- [ ] ${T("যৌক্তিক প্রবাহ ও পুনরাবৃত্তি নেই", "Logical flow, no repetition", l)}`,
    `- [ ] ${T("ধারাবাহিক পরিভাষা ও নম্বরিং", "Consistent terminology and numbering", l)}`,
    `- [ ] ${T("টেবিল, তারিখ ও সংখ্যার নির্ভুলতা", "Table, date and number accuracy", l)}`,
    `- [ ] ${T("অনুপস্থিত তথ্যে প্লেসহোল্ডার, বানানো তথ্য নয়", "Placeholders for gaps — never invented detail", l)}`,
    ``,
    `> ${T("আইনি, আর্থিক বা চিকিৎসাগত সিদ্ধান্ত প্রমাণের বাইরে গিয়ে দেওয়া হয় না।", "Legal, financial or medical conclusions are never inferred beyond the evidence.", l)}`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("PDF Space পাতায় ফাইল আপলোড করুন — প্রতিটি উত্তর পৃষ্ঠা নম্বরসহ সূত্র দেবে।", "Upload the file in PDF Space — every answer will cite the source page.", l),
  ].join("\n");
}

function researchBrief(q: string, l: Lang) {
  return [
    `## ${T("গবেষণা ব্রিফ কাঠামো", "Research brief structure", l)}`,
    ``,
    `**${T("প্রশ্ন", "Question", l)}:** ${q}`,
    `**Assumption:** ${T("এখনও কোনো লাইভ সূত্র সংযুক্ত হয়নি — নিচের কাঠামোয় প্রমাণ বসানো হবে।", "No live sources are attached yet — evidence will be slotted into the structure below.", l)}`,
    ``,
    `### ${T("১. মূল ফলাফল", "1. Key findings", l)}`,
    T("প্রতিটি ফলাফল এক বাক্যে, পাশে সূত্র নম্বর।", "One sentence per finding, each with a source number.", l),
    ``,
    `### ${T("২. প্রমাণের মান", "2. Evidence quality", l)}`,
    `| ${T("স্তর", "Tier", l)} | ${T("উৎস", "Source type", l)} | ${T("ওজন", "Weight", l)} |`,
    `| --- | --- | --- |`,
    `| A | ${T("সরকারি বা প্রাথমিক নথি", "Official or primary document", l)} | ${T("সর্বোচ্চ", "Highest", l)} |`,
    `| B | ${T("প্রতিষ্ঠিত সংবাদ বা শিল্প প্রতিবেদন", "Established news or industry report", l)} | ${T("মাঝারি", "Medium", l)} |`,
    `| C | ${T("ব্লগ, ফোরাম, অসমর্থিত দাবি", "Blog, forum, unverified claim", l)} | ${T("নিম্ন", "Low", l)} |`,
    ``,
    `### ${T("৩. স্ববিরোধিতা", "3. Contradictions", l)}`,
    T("সূত্রগুলোর মধ্যে অমিল থাকলে দুই পক্ষই দেখানো হবে, কোনটি বেশি নির্ভরযোগ্য তা যুক্তিসহ।", "Where sources disagree, both positions are shown with a reasoned reliability call.", l),
    ``,
    `### ${T("৪. ঝুঁকি ও অনিশ্চয়তা", "4. Risks and uncertainty", l)}`,
    `- ${T("তথ্যের বয়স ও পরিবর্তনের হার", "Age of the data and rate of change", l)}`,
    `- ${T("যাচাই করা যায়নি এমন দাবি", "Claims that could not be verified", l)}`,
    ``,
    `### ${T("৫. সুপারিশ", "5. Recommendation", l)}`,
    T("প্রমাণ থেকে সরাসরি অনুসৃত করণীয়, নিশ্চয়তার মাত্রাসহ।", "Actions that follow directly from the evidence, with a stated confidence level.", l),
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("API Settings-এ Exa কী যোগ করলে লাইভ সূত্র সহ পূর্ণ ব্রিফ তৈরি হবে।", "Add an Exa key in API Settings to run this with live, cited sources.", l),
  ].join("\n");
}

function businessPlaybook(q: string, l: Lang) {
  return [
    `## ${T("ব্যবসায়িক বিশ্লেষণ", "Business analysis", l)}`,
    ``,
    `**${T("বিষয়", "Topic", l)}:** ${q}`,
    ``,
    `### ${T("সিদ্ধান্তের কাঠামো", "Decision frame", l)}`,
    `| ${T("বিবেচনা", "Consideration", l)} | ${T("প্রশ্ন", "Question to answer", l)} |`,
    `| --- | --- |`,
    `| ${T("উদ্দেশ্য", "Objective", l)} | ${T("সাফল্য সংখ্যায় কেমন দেখাবে?", "What does success look like numerically?", l)} |`,
    `| ${T("বাজেট", "Budget", l)} | ${T("সর্বোচ্চ কত ব্যয় গ্রহণযোগ্য?", "What is the ceiling?", l)} |`,
    `| ${T("সম্পদ", "Resources", l)} | ${T("কে কাজটি করবে?", "Who actually does the work?", l)} |`,
    `| ${T("সময়", "Timeline", l)} | ${T("কখন ফল দরকার?", "When is the result needed?", l)} |`,
    `| ${T("ঝুঁকি", "Risk", l)} | ${T("ব্যর্থ হলে কী হারায়?", "What is lost if it fails?", l)} |`,
    `| ${T("পরিমাপ", "Measurement", l)} | ${T("কোন মেট্রিক প্রমাণ করবে?", "Which metric proves it worked?", l)} |`,
    ``,
    `### ${T("প্রস্তাবিত কাঠামো", "Recommended structure", l)}`,
    `1. ${T("বর্তমান অবস্থা ও সমস্যার আকার", "Current state and size of the problem", l)}`,
    `2. ${T("লক্ষ্য গ্রাহক ও তাদের বিকল্প", "Target customer and their alternatives", l)}`,
    `3. ${T("সমাধান ও পার্থক্যকারী", "Offer and differentiator", l)}`,
    `4. ${T("মূল্য ও মার্জিন যুক্তি", "Pricing and margin logic", l)}`,
    `5. ${T("চ্যানেল ও অধিগ্রহণ খরচ", "Channels and acquisition cost", l)}`,
    `6. ${T("ঝুঁকি ও নিয়ন্ত্রক বিষয়", "Risks and regulatory factors", l)}`,
    `7. ${T("৯০ দিনের বাস্তবায়ন পরিকল্পনা", "90-day implementation plan", l)}`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("বাজেট, সময়সীমা ও লক্ষ্য গ্রাহক জানান — আমি সংখ্যাসহ পূর্ণ পরিকল্পনা দেব।", "Share budget, timeline and target customer — I will produce the full plan with numbers.", l),
  ].join("\n");
}

function contentPlaybook(q: string, l: Lang) {
  return [
    `## ${T("কনটেন্ট ব্রিফ", "Content brief", l)}`,
    ``,
    `**${T("কাজ", "Task", l)}:** ${q}`,
    ``,
    `### ${T("লেখার আগে ঠিক করুন", "Lock these before writing", l)}`,
    `| ${T("উপাদান", "Element", l)} | ${T("সিদ্ধান্ত", "Decision", l)} |`,
    `| --- | --- |`,
    `| ${T("পাঠক", "Audience", l)} | ${T("কে পড়ছে, তারা কী জানে?", "Who reads it and what do they already know?", l)} |`,
    `| ${T("একটি বার্তা", "Single message", l)} | ${T("মনে রাখার মতো একটি বাক্য", "The one line they should remember", l)} |`,
    `| ${T("সুর", "Tone", l)} | ${T("পেশাদার / বন্ধুত্বপূর্ণ / কারিগরি", "Professional / friendly / technical", l)} |`,
    `| ${T("দৈর্ঘ্য", "Length", l)} | ${T("প্ল্যাটফর্ম অনুযায়ী", "Platform-appropriate", l)} |`,
    `| ${T("করণীয়", "Call to action", l)} | ${T("একটি স্পষ্ট পরবর্তী পদক্ষেপ", "One unambiguous next step", l)} |`,
    ``,
    `### ${T("কাঠামো", "Structure", l)}`,
    `1. ${T("হুক — প্রথম লাইনে সুনির্দিষ্ট সুবিধা", "Hook — a concrete benefit in line one", l)}`,
    `2. ${T("প্রেক্ষাপট — সমস্যাটি কেন গুরুত্বপূর্ণ", "Context — why the problem matters", l)}`,
    `3. ${T("প্রমাণ — সংখ্যা, উদাহরণ বা ঘটনা", "Proof — numbers, examples or a case", l)}`,
    `4. ${T("করণীয় — একটি স্পষ্ট নির্দেশ", "Action — one clear instruction", l)}`,
    ``,
    `### ${T("যা বাদ দিতে হবে", "Remove on edit", l)}`,
    `- ${T("সাধারণ দাবি যা প্রমাণহীন", "Generic claims without evidence", l)}`,
    `- ${T("পুনরাবৃত্ত বাক্যাংশ ও ফিলার", "Repeated phrases and filler", l)}`,
    `- ${T("প্রসঙ্গহীন পরিভাষা", "Jargon that adds no meaning", l)}`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("পাঠক, প্ল্যাটফর্ম ও দৈর্ঘ্য জানান — আমি চূড়ান্ত খসড়া লিখে দেব।", "Tell me the audience, platform and length — I will write the finished draft.", l),
  ].join("\n");
}

function visualPlaybook(q: string, l: Lang) {
  return [
    `## ${T("ভিজ্যুয়াল ব্রিফ", "Visual brief", l)}`,
    ``,
    `**${T("বিষয়", "Subject", l)}:** ${q}`,
    ``,
    `### ${T("প্রয়োজনীয় সংজ্ঞা", "Specification", l)}`,
    `| ${T("উপাদান", "Element", l)} | ${T("নির্দেশনা", "Direction", l)} |`,
    `| --- | --- |`,
    `| ${T("কম্পোজিশন", "Composition", l)} | ${T("এক-তৃতীয়াংশ নিয়ম, একটি স্পষ্ট কেন্দ্রবিন্দু", "Rule of thirds, one clear focal point", l)} |`,
    `| ${T("ক্যামেরা", "Camera", l)} | ${T("৫০ মিমি, চোখের সমান উচ্চতা", "50mm, eye level", l)} |`,
    `| ${T("আলো", "Lighting", l)} | ${T("নরম দিকনির্দেশক আলো, নিয়ন্ত্রিত ছায়া", "Soft directional light, controlled shadow", l)} |`,
    `| ${T("রঙ", "Palette", l)} | ${T("নিরপেক্ষ ভিত্তি + একটি উচ্চারণ রঙ", "Neutral base plus one accent", l)} |`,
    `| ${T("অনুপাত", "Aspect ratio", l)} | 16:9 · 1:1 · 4:5 |`,
    `| ${T("ব্যাকগ্রাউন্ড", "Background", l)} | ${T("পরিচ্ছন্ন, বিষয় থেকে আলাদা", "Clean, separated from the subject", l)} |`,
    ``,
    `### ${T("নেগেটিভ প্রম্পট", "Negative prompt", l)}`,
    T("অতিরিক্ত আঙুল, বিকৃত মুখ, ভুল বানান, ওয়াটারমার্ক, এলোমেলো লোগো, ভাঙা অ্যানাটমি, অপাঠ্য টাইপোগ্রাফি, অসঙ্গত পার্সপেক্টিভ।", "Extra fingers, distorted faces, misspelled text, watermarks, random logos, broken anatomy, unreadable typography, inconsistent perspective.", l),
    ``,
    `### ${T("সম্পাদনার নির্দেশনা", "Editing instructions", l)}`,
    `- ${T("যা অপরিবর্তিত থাকবে", "What must remain unchanged", l)}`,
    `- ${T("যা সরাতে বা বদলাতে হবে", "What is removed or replaced", l)}`,
    `- ${T("আলো, ছায়া, প্রান্ত ও পার্সপেক্টিভ মেলানো", "Match lighting, shadow, edges and perspective", l)}`,
    ``,
    `### ${T("পরবর্তী ধাপ", "Next step", l)}`,
    T("Images পাতায় গিয়ে স্টাইল বেছে নিন — ছবি ও পূর্ণ আর্ট ব্রিফ একসাথে তৈরি হবে।", "Open the Images page and pick a style — the image and full art brief are produced together.", l),
  ].join("\n");
}
