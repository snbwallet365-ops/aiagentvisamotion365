import { complete, readKeys, SYSTEM_PROMPT } from "@/lib/llm";
import { COUNTRIES, getCountry } from "@/lib/visa-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ইনটেক ইন্টারভিউয়ের ৭টি বাধ্যতামূলক ধাপ। */
export const INTAKE_STAGES = [
  { key: "passport", label: "পাসপোর্টের তথ্য", fields: ["passportNo", "passportValidityMonths", "nationality"] },
  { key: "purpose", label: "ভ্রমণের উদ্দেশ্য", fields: ["travelPurpose", "country", "visaType"] },
  { key: "employment", label: "চাকরির তথ্য", fields: ["jobOffer", "employerName", "jobTitle", "salary"] },
  { key: "finance", label: "আর্থিক অবস্থা", fields: ["bankBalance", "sponsor"] },
  { key: "history", label: "ভ্রমণ ইতিহাস", fields: ["travelHistory", "previousRejections"] },
  { key: "family", label: "পারিবারিক তথ্য", fields: ["married", "children"] },
  { key: "education", label: "শিক্ষা ও ভাষা", fields: ["education", "languageProficiency"] },
];

function missingFields(data: Record<string, unknown>) {
  const missing: { stage: string; label: string; field: string }[] = [];
  for (const stage of INTAKE_STAGES) {
    for (const f of stage.fields) {
      const v = data[f];
      if (v === undefined || v === null || v === "") missing.push({ stage: stage.key, label: stage.label, field: f });
    }
  }
  return missing;
}

const QUESTION_BN: Record<string, string> = {
  passportNo: "আপনার পাসপোর্ট নম্বরটি কত?",
  passportValidityMonths: "আপনার পাসপোর্টের মেয়াদ আর কত মাস বাকি আছে?",
  nationality: "আপনার জাতীয়তা কী?",
  travelPurpose: "আপনি কোন উদ্দেশ্যে যেতে চান — চাকরি, পড়াশোনা, ভ্রমণ নাকি পরিবার দেখতে?",
  country: "আপনি কোন দেশে যেতে চান?",
  visaType: "কোন ধরনের ভিসার জন্য আবেদন করতে চান?",
  jobOffer: "আপনার হাতে কি কোনো যাচাইকৃত জব অফার আছে?",
  employerName: "নিয়োগকর্তা প্রতিষ্ঠানের নাম কী?",
  jobTitle: "আপনাকে কোন পদে নিয়োগ দেওয়া হয়েছে?",
  salary: "প্রস্তাবিত মাসিক বেতন কত (ডলারে)?",
  bankBalance: "আপনার ব্যাংক হিসাবে বর্তমানে কত টাকা আছে (ডলারে)?",
  sponsor: "খরচ কে বহন করবেন — আপনি নিজে নাকি কোনো স্পন্সর?",
  travelHistory: "আগে কি কখনও বিদেশ ভ্রমণ করেছেন?",
  previousRejections: "আগে কি কোনো দেশের ভিসা প্রত্যাখ্যাত হয়েছে? হলে কতবার?",
  married: "আপনি কি বিবাহিত?",
  children: "আপনার কি সন্তান আছে? থাকলে কতজন?",
  education: "আপনার সর্বোচ্চ শিক্ষাগত যোগ্যতা কী?",
  languageProficiency: "IELTS বা অন্য কোনো ভাষা পরীক্ষার স্কোর আছে কি?",
};

export async function POST(request: Request) {
  const body = (await request.json()) as { applicantData?: Record<string, unknown> };
  const data = body.applicantData ?? {};
  const missing = missingFields(data);
  const rule = typeof data.country === "string" ? getCountry(data.country) : undefined;

  const progress = Math.round(((INTAKE_STAGES.flatMap((s) => s.fields).length - missing.length) /
    INTAKE_STAGES.flatMap((s) => s.fields).length) * 100);

  if (missing.length === 0) {
    return Response.json({
      complete: true,
      progress: 100,
      nextStage: null,
      question: "ধন্যবাদ! আপনার সব তথ্য সংগ্রহ করা হয়েছে। এখন আমি যোগ্যতা স্কোর ও ঝুঁকি বিশ্লেষণ তৈরি করছি।",
      remaining: [],
    });
  }

  const batch = missing.slice(0, 3);
  const context = [
    `সংগৃহীত তথ্য: ${JSON.stringify(data)}`,
    rule ? `লক্ষ্য দেশ: ${rule.countryBn} — ${rule.highlightBn}` : "দেশ এখনও নির্ধারিত হয়নি।",
    `অনুপস্থিত তথ্য: ${batch.map((m) => QUESTION_BN[m.field] ?? m.field).join(" / ")}`,
  ].join("\n");

  const { text, source } = await complete(
    [
      { role: "system", content: SYSTEM_PROMPT + "\nতুমি এখন ইনটেক ইন্টারভিউ নিচ্ছ। বন্ধুত্বপূর্ণ ভাষায় একসাথে সর্বোচ্চ তিনটি প্রশ্ন করো।" },
      { role: "user", content: `${context}\n\nউপরের অনুপস্থিত তথ্যগুলো জানতে বাংলায় প্রশ্ন করো এবং কেন এই তথ্য দরকার তা এক লাইনে বুঝিয়ে দাও।` },
    ],
    "visa-interview",
    readKeys(request),
  );

  const fallback = [
    `## ${batch[0].label}`,
    ``,
    ...batch.map((m, i) => `${i + 1}. ${QUESTION_BN[m.field] ?? m.field}`),
    ``,
    rule ? `> ${rule.countryBn}-এর জন্য এই তথ্যগুলো ছাড়া যোগ্যতা স্কোর নির্ভুল হবে না।` : `> দেশ নির্ধারণ করলে আমি নির্দিষ্ট নিয়ম অনুযায়ী পরামর্শ দিতে পারব।`,
  ].join("\n");

  return Response.json({
    complete: false,
    progress,
    nextStage: batch[0].stage,
    stageLabel: batch[0].label,
    question: source === "openrouter" ? text : fallback,
    remaining: missing.map((m) => m.field),
    supportedCountries: COUNTRIES.map((c) => ({ country: c.country, countryBn: c.countryBn, flag: c.flag })),
  });
}
