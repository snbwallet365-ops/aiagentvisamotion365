export type TaskType =
  | "visa-interview"
  | "eligibility-reasoning"
  | "document-generation"
  | "risk-analysis"
  | "fast-chat"
  | "multilingual"
  | "visa-policy-search"
  | "code-generation"
  | "voice-script"
  | "social-copy"
  | "vision-document"
  | "planning"
  | "review";

export interface FreeModel {
  id: string;
  vendor: string;
  context: string;
  role: string;
  avgLatencyMs: number;
  successRate: number;
  modality: "text" | "multimodal" | "audio" | "embedding";
}

/**
 * ৩০+ ফ্রি মডেলের অভ্যন্তরীণ ক্যাটালগ।
 * এই আইডিগুলো কখনও ব্যবহারকারীর সামনে দেখানো হয় না — UI-তে সবসময় "VisaMOTion"।
 */
export const FREE_MODELS: FreeModel[] = [
  { id: "nvidia/nemotron-3.5-lightning:free", vendor: "NVIDIA", context: "1M", role: "দ্রুত দীর্ঘ-প্রসঙ্গ", avgLatencyMs: 700, successRate: 98.9, modality: "text" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", vendor: "NVIDIA", context: "1M", role: "গভীর যুক্তি", avgLatencyMs: 2500, successRate: 97.2, modality: "text" },
  { id: "nvidia/nemotron-3-embed-1b:free", vendor: "NVIDIA", context: "33K", role: "এমবেডিং", avgLatencyMs: 260, successRate: 99.4, modality: "embedding" },
  { id: "nvidia/llama-nemotron-embed-vl-1b-v2:free", vendor: "NVIDIA", context: "33K", role: "ভিশন এমবেডিং", avgLatencyMs: 300, successRate: 99.3, modality: "embedding" },
  { id: "z-ai/glm-5.2:free", vendor: "Z.AI", context: "256K", role: "বাংলা ভাষা দক্ষতা", avgLatencyMs: 1600, successRate: 98.4, modality: "text" },
  { id: "z-ai/glm-4.5-air:free", vendor: "Z.AI", context: "131K", role: "দ্রুত সাধারণ কাজ", avgLatencyMs: 1100, successRate: 98.1, modality: "text" },
  { id: "dots-studio/dots-3-note-preview:free", vendor: "Dots Studio", context: "512K", role: "নোট ও সারাংশ", avgLatencyMs: 1050, successRate: 96.6, modality: "text" },
  { id: "thinkingmachines/inkling-small:free", vendor: "Thinking Machines", context: "128K", role: "ধাপে ধাপে চিন্তা", avgLatencyMs: 600, successRate: 98.3, modality: "text" },
  { id: "fish-audio/s2.1-pro-free:free", vendor: "Fish Audio", context: "64K", role: "ভয়েস স্ক্রিপ্ট", avgLatencyMs: 1300, successRate: 97.0, modality: "audio" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", vendor: "Meta", context: "131K", role: "বহুভাষিক চ্যাট", avgLatencyMs: 1200, successRate: 98.5, modality: "text" },
  { id: "meta-llama/llama-4-scout:free", vendor: "Meta", context: "10M", role: "দ্রুত চ্যাট", avgLatencyMs: 900, successRate: 98.2, modality: "text" },
  { id: "meta-llama/llama-4-maverick:free", vendor: "Meta", context: "1M", role: "মাল্টিমোডাল চ্যাট", avgLatencyMs: 1450, successRate: 97.5, modality: "multimodal" },
  { id: "google/gemma-3-27b-it:free", vendor: "Google", context: "131K", role: "কম-লেটেন্সি উত্তর", avgLatencyMs: 800, successRate: 99.1, modality: "text" },
  { id: "google/gemma-4-31b-it:free", vendor: "Google", context: "262K", role: "ছবি ও ভিডিও বিশ্লেষণ", avgLatencyMs: 1700, successRate: 97.8, modality: "multimodal" },
  { id: "google/gemma-3n-e4b-it:free", vendor: "Google", context: "32K", role: "হালকা ডিভাইস কাজ", avgLatencyMs: 520, successRate: 97.3, modality: "text" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", vendor: "Qwen", context: "262K", role: "টুল ব্যবহার ও RAG", avgLatencyMs: 1500, successRate: 98.8, modality: "text" },
  { id: "qwen/qwen3-235b-a22b:free", vendor: "Qwen", context: "40K", role: "জটিল বিশ্লেষণ", avgLatencyMs: 2900, successRate: 96.4, modality: "text" },
  { id: "qwen/qwen3-coder:free", vendor: "Qwen", context: "262K", role: "কোড ও স্ক্রিপ্ট", avgLatencyMs: 1650, successRate: 97.0, modality: "text" },
  { id: "qwen/qwen2.5-vl-72b-instruct:free", vendor: "Qwen", context: "131K", role: "ডকুমেন্ট ছবি পড়া", avgLatencyMs: 2100, successRate: 96.1, modality: "multimodal" },
  { id: "deepseek/deepseek-r1:free", vendor: "DeepSeek", context: "64K", role: "গণিত ও যুক্তি", avgLatencyMs: 2600, successRate: 96.9, modality: "text" },
  { id: "deepseek/deepseek-chat-v3-0324:free", vendor: "DeepSeek", context: "64K", role: "লেখা ও সারাংশ", avgLatencyMs: 1400, successRate: 97.6, modality: "text" },
  { id: "deepseek/deepseek-r1-distill-llama-70b:free", vendor: "DeepSeek", context: "128K", role: "দ্রুত যুক্তি", avgLatencyMs: 1250, successRate: 97.4, modality: "text" },
  { id: "mistral/mistral-nemo:free", vendor: "Mistral", context: "128K", role: "কোড ও বহুভাষা", avgLatencyMs: 1000, successRate: 97.4, modality: "text" },
  { id: "mistralai/mistral-small-3.2-24b-instruct:free", vendor: "Mistral", context: "128K", role: "সাধারণ নির্দেশনা", avgLatencyMs: 950, successRate: 97.2, modality: "text" },
  { id: "poolside/laguna-s-2.1:free", vendor: "Poolside", context: "262K", role: "কোডিং এজেন্ট", avgLatencyMs: 1800, successRate: 96.8, modality: "text" },
  { id: "arcee/trinity-large-preview:free", vendor: "Arcee", context: "262K", role: "জটিল যুক্তি", avgLatencyMs: 2200, successRate: 96.2, modality: "text" },
  { id: "arcee/trinity-mini:free", vendor: "Arcee", context: "131K", role: "হালকা কাজ", avgLatencyMs: 650, successRate: 98.0, modality: "text" },
  { id: "solar/solar-pro-3:free", vendor: "Upstage", context: "32K", role: "সাধারণ কাজ", avgLatencyMs: 950, successRate: 97.1, modality: "text" },
  { id: "inclusionai/ling-3.0-flash:free", vendor: "InclusionAI", context: "262K", role: "দ্রুত নির্দেশনা", avgLatencyMs: 750, successRate: 97.9, modality: "text" },
  { id: "moonshotai/kimi-vl-a3b-thinking:free", vendor: "Moonshot AI", context: "256K", role: "ভিশন যুক্তি", avgLatencyMs: 2000, successRate: 96.5, modality: "multimodal" },
  { id: "moonshotai/kimi-k2:free", vendor: "Moonshot AI", context: "131K", role: "এজেন্টিক টুল কল", avgLatencyMs: 1750, successRate: 97.1, modality: "text" },
  { id: "tngtech/deepseek-r1t2-chimera:free", vendor: "TNG", context: "163K", role: "সংকর যুক্তি", avgLatencyMs: 2300, successRate: 95.9, modality: "text" },
  { id: "microsoft/mai-ds-r1:free", vendor: "Microsoft", context: "163K", role: "নিরাপদ যুক্তি", avgLatencyMs: 2150, successRate: 96.7, modality: "text" },
  { id: "openrouter/free", vendor: "OpenRouter", context: "পরিবর্তনশীল", role: "স্বয়ংক্রিয় রাউটার", avgLatencyMs: 1400, successRate: 97.7, modality: "text" },
];

/** টাস্ক অনুযায়ী ফলব্যাক চেইন (প্রথমটি ব্যর্থ হলে পরেরটি)। */
export const TASK_ROUTING: Record<TaskType, string[]> = {
  "visa-interview": ["qwen/qwen3-next-80b-a3b-instruct:free", "z-ai/glm-5.2:free", "meta-llama/llama-3.3-70b-instruct:free"],
  "eligibility-reasoning": ["nvidia/nemotron-3-ultra-550b-a55b:free", "deepseek/deepseek-r1:free", "thinkingmachines/inkling-small:free"],
  "document-generation": ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3-next-80b-a3b-instruct:free", "dots-studio/dots-3-note-preview:free"],
  "risk-analysis": ["deepseek/deepseek-r1:free", "microsoft/mai-ds-r1:free", "arcee/trinity-large-preview:free"],
  "fast-chat": ["google/gemma-3-27b-it:free", "meta-llama/llama-4-scout:free", "z-ai/glm-4.5-air:free"],
  multilingual: ["z-ai/glm-5.2:free", "qwen/qwen3-next-80b-a3b-instruct:free", "meta-llama/llama-3.3-70b-instruct:free"],
  "visa-policy-search": ["qwen/qwen3-235b-a22b:free", "nvidia/nemotron-3.5-lightning:free", "moonshotai/kimi-k2:free"],
  "code-generation": ["qwen/qwen3-coder:free", "poolside/laguna-s-2.1:free", "mistral/mistral-nemo:free"],
  "voice-script": ["fish-audio/s2.1-pro-free:free", "z-ai/glm-5.2:free", "google/gemma-3-27b-it:free"],
  "social-copy": ["inclusionai/ling-3.0-flash:free", "deepseek/deepseek-chat-v3-0324:free", "z-ai/glm-4.5-air:free"],
  "vision-document": ["qwen/qwen2.5-vl-72b-instruct:free", "google/gemma-4-31b-it:free", "moonshotai/kimi-vl-a3b-thinking:free"],
  planning: ["moonshotai/kimi-k2:free", "nvidia/nemotron-3.5-lightning:free", "arcee/trinity-mini:free"],
  review: ["microsoft/mai-ds-r1:free", "tngtech/deepseek-r1t2-chimera:free", "solar/solar-pro-3:free"],
};

export const TASK_TYPES = Object.keys(TASK_ROUTING) as TaskType[];

/** বাংলা লেবেল — UI-তে টাস্ক দেখানো হলে মডেলের নাম নয়, কাজের নাম দেখাবে। */
export const TASK_LABEL_BN: Record<TaskType, string> = {
  "visa-interview": "ভিসা ইন্টারভিউ",
  "eligibility-reasoning": "যোগ্যতা বিশ্লেষণ",
  "document-generation": "ডকুমেন্ট তৈরি",
  "risk-analysis": "ঝুঁকি বিশ্লেষণ",
  "fast-chat": "দ্রুত উত্তর",
  multilingual: "বাংলা ভাষা",
  "visa-policy-search": "নীতি অনুসন্ধান",
  "code-generation": "স্ক্রিপ্ট তৈরি",
  "voice-script": "ভয়েস স্ক্রিপ্ট",
  "social-copy": "সোশ্যাল কনটেন্ট",
  "vision-document": "ডকুমেন্ট রিডিং",
  planning: "পরিকল্পনা",
  review: "যাচাই",
};

export function chainFor(task: TaskType): string[] {
  return TASK_ROUTING[task] ?? TASK_ROUTING["fast-chat"];
}

export function primaryModel(task: TaskType): string {
  return chainFor(task)[0];
}

export function getModel(id: string): FreeModel | undefined {
  return FREE_MODELS.find((m) => m.id === id);
}

/** এজেন্ট মোডে ধাপে ধাপে যেসব বিশেষজ্ঞ কাজ করে। */
export interface AgentStage {
  key: string;
  labelBn: string;
  task: TaskType;
  phase: "thinking" | "searching" | "acting" | "writing" | "reviewing";
}

export const AGENT_PIPELINE: AgentStage[] = [
  { key: "plan", labelBn: "পরিকল্পনা তৈরি করা হচ্ছে", task: "planning", phase: "thinking" },
  { key: "research", labelBn: "সর্বশেষ ভিসা নীতি খোঁজা হচ্ছে", task: "visa-policy-search", phase: "searching" },
  { key: "analyze", labelBn: "যোগ্যতা ও ঝুঁকি হিসাব করা হচ্ছে", task: "eligibility-reasoning", phase: "acting" },
  { key: "draft", labelBn: "বাংলায় বিস্তারিত উত্তর লেখা হচ্ছে", task: "multilingual", phase: "writing" },
  { key: "review", labelBn: "তথ্য যাচাই ও চূড়ান্ত করা হচ্ছে", task: "review", phase: "reviewing" },
];

export const MODEL_COUNT = FREE_MODELS.length;
