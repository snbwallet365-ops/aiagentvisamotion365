/** ব্যবহারকারীর নিজস্ব API কী (Bring Your Own Key)। ব্রাউজারে সংরক্ষিত, প্রতি রিকোয়েস্টে হেডারে যায়। */
export interface UserKeys {
  openrouter: string;
  groq: string;
  exa: string;
}

export const EMPTY_KEYS: UserKeys = { openrouter: "", groq: "", exa: "" };
export const KEYS_STORAGE = "visamotion.keys.v1";

export const KEY_FIELDS: {
  id: keyof UserKeys; label: string; placeholder: string; help: string; url: string;
}[] = [
  {
    id: "openrouter", label: "OpenRouter API Key", placeholder: "sk-or-v1-…",
    help: "৩৪টি ফ্রি মডেলের রাউটার — চ্যাট, রিজনিং ও ডকুমেন্ট তৈরিতে ব্যবহৃত হয়।",
    url: "https://openrouter.ai/keys",
  },
  {
    id: "groq", label: "Groq API Key", placeholder: "gsk_…",
    help: "অতি দ্রুত ইনফারেন্স — OpenRouter ব্যর্থ হলে স্বয়ংক্রিয় ফলব্যাক।",
    url: "https://console.groq.com/keys",
  },
  {
    id: "exa", label: "Exa.ai API Key", placeholder: "exa_…",
    help: "লাইভ ভিসা নীতি অনুসন্ধান ও ডিপ রিসার্চের জন্য।",
    url: "https://dashboard.exa.ai/api-keys",
  },
];

export function loadKeys(): UserKeys {
  if (typeof window === "undefined") return { ...EMPTY_KEYS };
  try {
    const raw = window.localStorage.getItem(KEYS_STORAGE);
    if (!raw) return { ...EMPTY_KEYS };
    const parsed = JSON.parse(raw) as Partial<UserKeys>;
    return { ...EMPTY_KEYS, ...parsed };
  } catch {
    return { ...EMPTY_KEYS };
  }
}

export function saveKeys(keys: UserKeys) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
  window.dispatchEvent(new CustomEvent("keys-updated"));
}

export function clearKeys() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS_STORAGE);
  window.dispatchEvent(new CustomEvent("keys-updated"));
}

/** কী গুলো হেডারে পাঠাই — সার্ভার শুধু রিকোয়েস্টের সময় ব্যবহার করে, কখনও সংরক্ষণ করে না। */
export function keyHeaders(keys?: UserKeys): Record<string, string> {
  const k = keys ?? loadKeys();
  const h: Record<string, string> = {};
  if (k.openrouter.trim()) h["x-openrouter-key"] = k.openrouter.trim();
  if (k.groq.trim()) h["x-groq-key"] = k.groq.trim();
  if (k.exa.trim()) h["x-exa-key"] = k.exa.trim();
  return h;
}

export function maskKey(v: string) {
  if (!v) return "";
  if (v.length <= 10) return "•".repeat(v.length);
  return `${v.slice(0, 6)}${"•".repeat(Math.min(18, v.length - 10))}${v.slice(-4)}`;
}
