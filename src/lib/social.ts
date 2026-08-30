import { COUNTRIES } from "./visa-data";

export const PLATFORMS = ["linkedin", "instagram", "x", "facebook", "tiktok", "youtube"] as const;
export const TOPICS = ["visa-update", "success-story", "recruitment", "educational"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Topic = (typeof TOPICS)[number];

export const PLATFORM_BN: Record<Platform, string> = {
  linkedin: "লিংকডইন",
  instagram: "ইনস্টাগ্রাম",
  x: "এক্স (টুইটার)",
  facebook: "ফেসবুক",
  tiktok: "টিকটক",
  youtube: "ইউটিউব",
};

export const TOPIC_BN: Record<Topic, string> = {
  "visa-update": "ভিসা আপডেট",
  "success-story": "সফলতার গল্প",
  recruitment: "নিয়োগ বিজ্ঞপ্তি",
  educational: "শিক্ষামূলক",
};

const PLATFORM_GUIDE: Record<Platform, string> = {
  linkedin: "পেশাদার ভাষা, ১৫০–৩০০ শব্দ, ৩–৫টি হ্যাশট্যাগ।",
  instagram: "ভিজ্যুয়াল ও ইমোজিনির্ভর, ১০০–২০০ শব্দ, ৫–৮টি হ্যাশট্যাগ।",
  x: "২৮০ অক্ষরের মধ্যে, ঝটপট বার্তা, ২–৩টি হ্যাশট্যাগ।",
  facebook: "বন্ধুত্বপূর্ণ বাংলা ভাষা, ১০০–২৫০ শব্দ।",
  tiktok: "প্রথম লাইনেই হুক, স্ক্রিপ্ট ধাঁচে ৬০–১২০ শব্দ।",
  youtube: "ভিডিও বর্ণনার ধাঁচে, অধ্যায় ভাগ ও ৫টি হ্যাশট্যাগ।",
};

export function platformGuide(p: Platform) {
  return PLATFORM_GUIDE[p];
}

export function buildSocialPrompt(platform: Platform, topic: Topic, country?: string) {
  return `একটি বাংলাদেশি এআই ভিসা এজেন্সির জন্য ${PLATFORM_BN[platform]} পোস্ট লেখো।
বিষয়: ${TOPIC_BN[topic]}${country ? ` (${country} সম্পর্কিত)` : ""}।
নিয়ম: ${PLATFORM_GUIDE[platform]}
সম্পূর্ণ বাংলায় লেখো। প্রথমে ক্যাপশন, তারপর "HASHTAGS:" দিয়ে হ্যাশট্যাগ, তারপর "CTA:" দিয়ে কল-টু-অ্যাকশন।`;
}

interface Draft { caption: string; hashtags: string[]; callToAction: string }

export function parseDraft(text: string, fallback: Draft): Draft {
  const hashLine = text.match(/HASHTAGS:\s*(.+)/i)?.[1];
  const ctaLine = text.match(/CTA:\s*(.+)/i)?.[1];
  const caption = text.split(/HASHTAGS:/i)[0].trim();
  const hashtags = hashLine
    ? hashLine.split(/[\s,]+/).filter((h) => h.startsWith("#"))
    : Array.from(new Set(text.match(/#[\p{L}\d_]+/gu) ?? []));
  if (!caption) return fallback;
  return {
    caption,
    hashtags: hashtags.length ? hashtags : fallback.hashtags,
    callToAction: ctaLine?.trim() || fallback.callToAction,
  };
}

export function templateDraft(platform: Platform, topic: Topic, country?: string): Draft {
  const rule = COUNTRIES.find((c) => c.country === country) ?? COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const visa = rule.visaTypesBn[0];
  const days = rule.processingDays[rule.visaTypes[0]];
  const bodies: Record<Topic, string> = {
    "visa-update": `${rule.flag} ${rule.countryBn} — ${visa} আপডেট\n\n${rule.highlightBn}\nবর্তমান গড় প্রসেসিং সময় প্রায় ${days} দিন। ন্যূনতম তহবিল ${rule.minimumBankBalance.toLocaleString("bn-BD")} ডলার সমতুল্য।\n\nআমাদের এআই এজেন্ট প্রতি ৬ ঘণ্টায় প্রতিটি খোলা ফাইল সর্বশেষ নীতির সঙ্গে মিলিয়ে দেখে — তাই নিয়ম বদলালেও কোনো ক্লায়েন্ট পিছিয়ে পড়ে না।`,
    "success-story": `${rule.flag} ${rule.countryBn}-এর আরেকটি ${visa} অনুমোদিত হলো!\n\nপ্রথম ইন্টারভিউ থেকে দূতাবাসে জমা — প্রতিটি ধাপ আমাদের এআই এজেন্ট ট্র্যাক করেছে: যোগ্যতা স্কোর, ডকুমেন্ট চেকলিস্ট, পোর্টাল অটোমেশন ও অ্যাপয়েন্টমেন্ট বুকিং।\n\nএই রুটে গড় সিদ্ধান্তের সময় প্রায় ${days} দিন।`,
    recruitment: `${rule.flag} ${rule.countryBn}-এর জন্য নিয়োগ চলছে\n\nনিয়োগকর্তা-স্পন্সরড ${visa} পদ খালি আছে। ${rule.highlightBn}\n\nযা লাগবে: বৈধ পাসপোর্ট (১২ মাসের বেশি মেয়াদ), ${rule.minimumBankBalance.toLocaleString("bn-BD")} ডলার সমতুল্য তহবিলের প্রমাণ এবং আমাদের ফ্রি চেকলিস্টের কাগজপত্র।`,
    educational: `${rule.countryBn} ${visa} আসলে কীভাবে কাজ করে ${rule.flag}\n\n১. নিয়োগকর্তা স্পন্সরশিপ ফাইল করেন (${rule.extraDocumentsBn[0] ?? "অথরাইজেশন"})\n২. আবেদনকারী ডকুমেন্ট প্যাক তৈরি করেন\n৩. অনলাইনে আবেদন ও বায়োমেট্রিক\n৪. প্রায় ${days} দিনে সিদ্ধান্ত\n\nপ্রথম ধাপ বাদ পড়লেই পুরো ফাইল আটকে যায় — এখানেই বেশিরভাগ এজেন্সি সময় নষ্ট করে।`,
  };
  const tag = rule.country.replace(/\s+/g, "");
  return {
    caption: bodies[topic],
    hashtags: [`#${tag}Visa`, "#বিদেশেচাকরি", "#ভিসা", "#VisaMOTion", "#WorkAbroad"],
    callToAction: topic === "recruitment" ? "আবেদন করতে বায়োর লিংকে যান" : "ফ্রি যোগ্যতা যাচাই করতে মেসেজ দিন",
  };
}
