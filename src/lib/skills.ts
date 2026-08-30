export interface Skill {
  key: string;
  name: string;
  group: string;
  desc: string;
  icon: string;
  href: string;
  prompt?: string;
}

export const SKILL_GROUPS = [
  "Research & Knowledge",
  "Documents & PDF",
  "Visuals & Branding",
  "Web & UI/UX",
  "Data & Dashboards",
  "Code & Automation",
  "Business & Strategy",
  "Content & Communication",
  "Planning & Decisions",
] as const;

export type SkillGroup = (typeof SKILL_GROUPS)[number];

export const GROUP_META: Record<SkillGroup, { blurb: string; accent: string }> = {
  "Research & Knowledge": { blurb: "Evidence-first briefs that separate fact, assumption and recommendation.", accent: "#1d4ed8" },
  "Documents & PDF": { blurb: "Ingest, extract, compare, restructure and export professional documents.", accent: "#b45309" },
  "Visuals & Branding": { blurb: "Art direction, image prompts, brand systems and accessible palettes.", accent: "#6d28d9" },
  "Web & UI/UX": { blurb: "Design systems, component architecture, reviews and accessibility audits.", accent: "#0f766e" },
  "Data & Dashboards": { blurb: "Cleaning, statistics, KPI design and self-contained chart dashboards.", accent: "#15803d" },
  "Code & Automation": { blurb: "Runnable code, debugging, pipelines and workflow automation specs.", accent: "#111827" },
  "Business & Strategy": { blurb: "Plans, pricing, competitive analysis, SOPs and executive reporting.", accent: "#b91c1c" },
  "Content & Communication": { blurb: "Writing, editing, outreach, presentations and multi-channel messaging.", accent: "#c2410c" },
  "Planning & Decisions": { blurb: "Scope, milestones, risk registers and weighted decision matrices.", accent: "#4338ca" },
};

export const SKILLS: Skill[] = [
  /* Research & Knowledge */
  { key: "research-brief", name: "Research brief", group: "Research & Knowledge", desc: "Findings, evidence, risks and recommendations with cited sources.", icon: "◎", href: "/search", prompt: "Research brief: latest global skilled-migration policy shifts" },
  { key: "fact-separation", name: "Fact vs assumption", group: "Research & Knowledge", desc: "Splits verified facts, assumptions, interpretations and advice.", icon: "◇", href: "/chat", prompt: "Separate facts, assumptions and recommendations for this topic: remote work visas" },
  { key: "source-compare", name: "Source comparison", group: "Research & Knowledge", desc: "Finds contradictions across documents and ranks reliability.", icon: "⇄", href: "/pdf", prompt: "Compare these documents and list every contradiction" },
  { key: "explain", name: "Explain simply", group: "Research & Knowledge", desc: "Plain-language first, then advanced technical depth.", icon: "◐", href: "/chat", prompt: "Explain vector embeddings simply, then in technical depth" },
  { key: "study-notes", name: "Study notes & flashcards", group: "Research & Knowledge", desc: "Q&A sets, flashcards and revision outlines from any source.", icon: "▤", href: "/pdf", prompt: "Create flashcards and a Q&A set from this document" },

  /* Documents & PDF */
  { key: "pdf-analyze", name: "PDF analysis", group: "Documents & PDF", desc: "Type, purpose, outline, claims, numbers, gaps and page references.", icon: "▦", href: "/pdf", prompt: "Analyse this PDF: outline, key claims, numbers, risks and gaps" },
  { key: "table-extract", name: "Table extraction", group: "Documents & PDF", desc: "Preserves rows, columns, units, totals and labels.", icon: "▥", href: "/pdf", prompt: "Extract every table with units and totals preserved" },
  { key: "contract-review", name: "Contract review", group: "Documents & PDF", desc: "Obligations, dates, liabilities, missing clauses and red flags.", icon: "⌗", href: "/pdf", prompt: "Review this contract for obligations, deadlines and risks" },
  { key: "exec-summary", name: "Executive summary", group: "Documents & PDF", desc: "One-page brief with decisions, numbers and next steps.", icon: "≡", href: "/pdf", prompt: "Write an executive summary of this document" },
  { key: "doc-build", name: "Document builder", group: "Documents & PDF", desc: "Proposals, SOPs, manuals, policies, resumes — export ready.", icon: "◫", href: "/documents", prompt: "Create a standard operating procedure for client onboarding" },
  { key: "doc-export", name: "PDF / DOCX export", group: "Documents & PDF", desc: "Any answer becomes a formatted A4 PDF, DOCX or DOC file.", icon: "⤓", href: "/documents" },
  { key: "minutes", name: "Minutes & action items", group: "Documents & PDF", desc: "Decisions, owners, deadlines and follow-ups from raw notes.", icon: "✓", href: "/chat", prompt: "Turn these meeting notes into minutes with action items and owners" },

  /* Visuals & Branding */
  { key: "image-gen", name: "Image generation", group: "Visuals & Branding", desc: "Subject, lighting, composition, palette and negative prompts.", icon: "◧", href: "/images", prompt: "Generate an image: professional visa consultancy hero banner" },
  { key: "art-direction", name: "Art direction brief", group: "Visuals & Branding", desc: "Full production brief: camera, mood, materials, aspect ratio.", icon: "◉", href: "/images", prompt: "Write an art direction brief for a brand launch photo shoot" },
  { key: "brand-system", name: "Brand system", group: "Visuals & Branding", desc: "Colours, type, spacing, radius, buttons, icons, voice and tone.", icon: "◈", href: "/palette", prompt: "Create a brand system from the colour #2f6bff" },
  { key: "palette", name: "Smart colour palette", group: "Visuals & Branding", desc: "11-step shades, semantic tokens and WCAG contrast checks.", icon: "◑", href: "/palette" },
  { key: "infographic", name: "Infographic & diagram", group: "Visuals & Branding", desc: "Flowcharts, mind maps, process diagrams and storyboards.", icon: "⌸", href: "/canvas", prompt: "Design an infographic explaining the work-permit process" },

  /* Web & UI/UX */
  { key: "design-system", name: "Design system", group: "Web & UI/UX", desc: "Atomic components, tokens, states and responsive rules.", icon: "▣", href: "/chat", prompt: "Design a component library and token set for a SaaS admin panel" },
  { key: "ui-review", name: "UI/UX review", group: "Web & UI/UX", desc: "Severity, location, problem, impact and concrete code fix.", icon: "⌕", href: "/chat", prompt: "Review this interface for spacing, hierarchy, contrast and accessibility issues" },
  { key: "user-flow", name: "User flows & IA", group: "Web & UI/UX", desc: "Journeys, information architecture, wireframe structure.", icon: "⇢", href: "/canvas", prompt: "Map the user flow and information architecture for an onboarding funnel" },
  { key: "a11y", name: "Accessibility audit", group: "Web & UI/UX", desc: "Contrast, focus order, semantics, reduced motion and labels.", icon: "◍", href: "/chat", prompt: "Run an accessibility audit checklist for a form-heavy dashboard" },
  { key: "animation", name: "Motion design", group: "Web & UI/UX", desc: "Purposeful timelines, easing, reduced-motion fallbacks.", icon: "∿", href: "/chat", prompt: "Plan scroll-based animations for a landing page with reduced-motion fallbacks" },

  /* Data & Dashboards */
  { key: "data-clean", name: "Data cleaning", group: "Data & Dashboards", desc: "Missing values, duplicates, outliers, units and assumptions.", icon: "⊞", href: "/chat", prompt: "Clean and profile this dataset, listing assumptions and limitations" },
  { key: "stats", name: "Descriptive statistics", group: "Data & Dashboards", desc: "Trends, segments, distributions — never correlation as cause.", icon: "◱", href: "/chat", prompt: "Give descriptive statistics and trend analysis for this data" },
  { key: "kpi", name: "KPI framework", group: "Data & Dashboards", desc: "Metric definitions, targets, owners and review cadence.", icon: "◐", href: "/system", prompt: "Design a KPI framework for a services business" },
  { key: "dashboard", name: "Dashboard builder", group: "Data & Dashboards", desc: "KPI cards, charts, filters and responsive layouts.", icon: "▤", href: "/system", prompt: "Build a dashboard spec with KPI cards and the right chart types" },

  /* Code & Automation */
  { key: "code-write", name: "Write code", group: "Code & Automation", desc: "Complete runnable code with setup, errors handled and tests.", icon: "⌨", href: "/chat", prompt: "Write a typed API route with validation, error handling and tests" },
  { key: "debug", name: "Debug & refactor", group: "Code & Automation", desc: "Root cause, corrected code, related issues, test plan.", icon: "◎", href: "/chat", prompt: "Debug this error and explain the root cause plus a test plan" },
  { key: "json-canvas", name: "JSON Canvas", group: "Code & Automation", desc: "Mind maps, flowcharts and decision trees as portable JSON.", icon: "⬡", href: "/canvas" },
  { key: "automation", name: "Automation spec", group: "Code & Automation", desc: "Trigger, inputs, steps, conditions, errors, approvals, logging.", icon: "⌁", href: "/automation", prompt: "Design an automation: trigger, steps, error handling and approval points" },
  { key: "browser-automation", name: "Browser workflows", group: "Code & Automation", desc: "Portal login, form filling, booking and archiving with retries.", icon: "⟳", href: "/automation" },

  /* Business & Strategy */
  { key: "business-plan", name: "Business plan", group: "Business & Strategy", desc: "Objective, market, model, costs, risks and milestones.", icon: "◪", href: "/chat", prompt: "Draft a business plan outline for a consultancy launch" },
  { key: "competitor", name: "Competitor analysis", group: "Business & Strategy", desc: "Positioning, pricing, gaps and differentiation levers.", icon: "⇆", href: "/search", prompt: "Run a competitor analysis with positioning and pricing gaps" },
  { key: "pricing", name: "Pricing framework", group: "Business & Strategy", desc: "Tiers, anchors, margin logic and objection handling.", icon: "₵", href: "/chat", prompt: "Build a pricing framework with three tiers and margin logic" },
  { key: "sop", name: "SOPs & policies", group: "Business & Strategy", desc: "Repeatable procedures with owners and acceptance criteria.", icon: "▤", href: "/documents", prompt: "Write an SOP with owners, steps and acceptance criteria" },
  { key: "visa-intel", name: "Visa intelligence", group: "Business & Strategy", desc: "15-country rules, eligibility scoring, risk and fees.", icon: "◈", href: "/applications" },

  /* Content & Communication */
  { key: "copywriting", name: "Copywriting", group: "Content & Communication", desc: "Landing pages, ads, emails, product and campaign copy.", icon: "✎", href: "/chat", prompt: "Write landing page copy with headline, subhead, benefits and CTA" },
  { key: "editing", name: "Edit & rewrite", group: "Content & Communication", desc: "Tightens flow, removes filler, fixes tone and consistency.", icon: "◌", href: "/chat", prompt: "Edit this text for clarity, tone and flow without changing meaning" },
  { key: "presentation", name: "Presentation builder", group: "Content & Communication", desc: "Slide titles, key messages, speaker notes and visuals.", icon: "▭", href: "/chat", prompt: "Build a 10-slide deck outline with speaker notes" },
  { key: "outreach", name: "Email & messaging", group: "Content & Communication", desc: "Voice, WhatsApp, Messenger, Instagram and email drafts.", icon: "◈", href: "/comms" },
  { key: "social", name: "Social content", group: "Content & Communication", desc: "Platform-tuned captions, hashtags, scheduling and analytics.", icon: "❍", href: "/social" },

  /* Planning & Decisions */
  { key: "project-plan", name: "Project plan", group: "Planning & Decisions", desc: "Scope, milestones, dependencies, owners and acceptance criteria.", icon: "▦", href: "/chat", prompt: "Turn this idea into a project plan with milestones and acceptance criteria" },
  { key: "decision", name: "Decision matrix", group: "Planning & Decisions", desc: "Weighted criteria, trade-offs and a clear recommendation.", icon: "⚖", href: "/chat", prompt: "Compare these options with a weighted decision matrix" },
  { key: "risk", name: "Risk register", group: "Planning & Decisions", desc: "Likelihood, impact, mitigation and early-warning signals.", icon: "△", href: "/chat", prompt: "Build a risk register with likelihood, impact and mitigations" },
  { key: "daily-plan", name: "Daily & weekly plan", group: "Planning & Decisions", desc: "Priorities, time blocks, next actions and review points.", icon: "◷", href: "/chat", prompt: "Plan my week with priorities, time blocks and review points" },
  { key: "qc", name: "Quality-control review", group: "Planning & Decisions", desc: "Runs the full QC checklist before anything is delivered.", icon: "✓", href: "/chat", prompt: "Run a quality-control review on this deliverable" },
];

export const SKILL_COUNT = SKILLS.length;
