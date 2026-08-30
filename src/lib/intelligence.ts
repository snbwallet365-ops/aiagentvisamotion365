import { BASE_CHECKLIST, getCountry } from "./visa-data";

export interface ApplicantProfile {
  fullName?: string;
  age?: number;
  nationality?: string;
  passportValidityMonths?: number;
  bankBalance?: number;
  jobOffer?: boolean;
  salary?: number;
  previousRejections?: number;
  travelHistory?: boolean;
  education?: string;
  languageProficiency?: string;
  married?: boolean;
  children?: number;
}

export interface EligibilityResult {
  score: number;
  breakdown: { passport: number; financial: number; employment: number; travelHistory: number; education: number };
  recommendations: string[];
  redFlags: string[];
}

export function calculateEligibilityScore(
  country: string,
  visaType: string,
  a: ApplicantProfile,
): EligibilityResult {
  const rule = getCountry(country);
  const minBalance = rule?.minimumBankBalance ?? 5000;

  const passportMonths = a.passportValidityMonths ?? 0;
  const passport = passportMonths >= 12 ? 20 : passportMonths >= 6 ? 14 : 4;

  const balance = a.bankBalance ?? 0;
  const ratio = minBalance > 0 ? balance / minBalance : 1;
  const financial = Math.round(Math.max(0, Math.min(25, ratio * 25)));

  let employment = 0;
  if (a.jobOffer) employment += 18;
  const salary = a.salary ?? 0;
  employment += salary >= 4000 ? 12 : salary >= 2000 ? 8 : salary >= 800 ? 4 : 0;
  employment = Math.min(30, employment);

  const rejections = a.previousRejections ?? 0;
  let travelHistory = a.travelHistory ? 15 : 7;
  travelHistory -= rejections * 5;
  travelHistory = Math.max(0, travelHistory);

  const edu = (a.education ?? "").toLowerCase();
  let education = edu.includes("phd") || edu.includes("master") ? 10 : edu.includes("bsc") || edu.includes("bachelor") || edu.includes("ba") ? 8 : edu ? 5 : 2;
  if ((a.languageProficiency ?? "").length > 0) education = Math.min(10, education + 2);

  const score = Math.max(0, Math.min(100, passport + financial + employment + travelHistory + education));

  const bn = rule?.countryBn ?? country;
  const recommendations: string[] = [];
  const redFlags: string[] = [];
  if (passportMonths < 6) redFlags.push("পাসপোর্টের মেয়াদ ৬ মাসের কম");
  if (balance < minBalance) redFlags.push(`ব্যাংক ব্যালেন্স ${bn}-এর ন্যূনতম সীমার (${minBalance.toLocaleString("bn-BD")} ডলার সমতুল্য) নিচে`);
  if (!a.jobOffer) redFlags.push("যাচাইকৃত জব অফার বা স্পন্সরশিপ নেই");
  if (rejections > 1) redFlags.push(`পূর্বে ${rejections.toLocaleString("bn-BD")} বার ভিসা রিফিউজাল হয়েছে`);
  if (!a.travelHistory) redFlags.push("আগে কোনো আন্তর্জাতিক ভ্রমণের রেকর্ড নেই");

  if (balance < minBalance) recommendations.push(`ব্যাংক ব্যালেন্স কমপক্ষে ${minBalance.toLocaleString("bn-BD")} ডলার সমতুল্য করুন এবং ৬ মাসের স্টেটমেন্ট রাখুন`);
  if (passportMonths < 12) recommendations.push("আবেদন জমার আগে পাসপোর্ট নবায়ন করুন");
  if (!a.jobOffer) recommendations.push(`${bn} স্পন্সরনির্ভর দেশ — আগে নিয়োগকর্তার অফার নিশ্চিত করুন`);
  if (rule?.extraDocumentsBn.length) recommendations.push(`দেশভিত্তিক বিশেষ কাগজ প্রস্তুত রাখুন: ${rule.extraDocumentsBn.join(", ")}`);
  if (!a.languageProficiency) recommendations.push("ভাষা পরীক্ষার স্কোর যুক্ত করলে ফাইল শক্তিশালী হবে");
  if (recommendations.length === 0) recommendations.push("প্রোফাইল শক্তিশালী — ডকুমেন্ট সংগ্রহ ও আবেদন জমার ধাপে যান");

  return {
    score,
    breakdown: { passport, financial, employment, travelHistory, education },
    recommendations,
    redFlags,
  };
}

export interface RiskResult {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  redFlags: string[];
  mitigations: string[];
}

export function analyzeRisk(country: string, a: ApplicantProfile): RiskResult {
  const rule = getCountry(country);
  const minBalance = rule?.minimumBankBalance ?? 5000;
  const redFlags: string[] = [];
  let riskScore = 0;

  if ((a.passportValidityMonths ?? 0) < 6) { redFlags.push("পাসপোর্টের মেয়াদ ৬ মাসের কম"); riskScore += 20; }
  if ((a.bankBalance ?? 0) < minBalance) { redFlags.push("আর্থিক সক্ষমতা যাচাইয়ের জন্য ব্যাংক ব্যালেন্স অপর্যাপ্ত"); riskScore += 25; }
  if ((a.previousRejections ?? 0) > 2) { redFlags.push("একাধিকবার ভিসা রিফিউজালের রেকর্ড"); riskScore += 30; }
  else if ((a.previousRejections ?? 0) > 0) { redFlags.push("পূর্বে ভিসা রিফিউজালের রেকর্ড"); riskScore += 12; }
  if (!a.jobOffer || (a.salary ?? 0) < 2000) { redFlags.push("চাকরির প্রমাণ দুর্বল বা ঘোষিত বেতন কম"); riskScore += 15; }
  if (!a.travelHistory) { redFlags.push("পূর্ববর্তী আন্তর্জাতিক ভ্রমণের রেকর্ড নেই"); riskScore += 10; }

  riskScore = Math.min(100, riskScore);
  return {
    riskScore,
    riskLevel: riskScore > 50 ? "HIGH" : riskScore > 25 ? "MEDIUM" : "LOW",
    redFlags,
    mitigations: [
      "গন্তব্য দেশের প্রতিষ্ঠান থেকে শক্তিশালী স্পন্সরশিপ বা আমন্ত্রণপত্র সংযুক্ত করুন",
      "ব্যাংক স্টেটমেন্টে ধারাবাহিক ৬ মাসের বেতন জমা দেখান",
      "দেশে ফেরার অভিপ্রায় প্রমাণে সম্পত্তি বা পারিবারিক বন্ধনের কাগজ দিন",
      "পূর্বের রিফিউজাল থাকলে কভার লেটারে বিস্তারিত ব্যাখ্যা দিন",
    ],
  };
}

export function calculateSuccessProbability(eligibilityScore: number, riskScore: number, country: string): number {
  const factor = getCountry(country)?.countryRiskFactor ?? 55;
  const base = eligibilityScore - riskScore * 0.5;
  const adjusted = base - (factor - 50) * 0.35;
  return Math.round(Math.max(2, Math.min(98, adjusted)));
}

export function calculateVisaFee(country: string, visaType: string, nationality = "Bangladesh") {
  const rule = getCountry(country);
  const baseFee = rule?.fees[visaType] ?? Object.values(rule?.fees ?? { x: 0 })[0] ?? 0;
  const adjustments: Record<string, number> = { Bangladesh: 1.0, India: 1.0, Nepal: 1.0, Pakistan: 1.2, "Sri Lanka": 1.1 };
  const adjustment = adjustments[nationality] ?? 1.05;
  const serviceFee = 150;
  return {
    baseFee,
    adjustment,
    governmentFee: Math.round(baseFee * adjustment),
    serviceFee,
    finalFee: Math.round(baseFee * adjustment + serviceFee),
    currency: rule?.currency ?? "USD",
  };
}

export function predictProcessingTime(country: string, visaType: string, season: "peak" | "off-peak" = "off-peak") {
  const rule = getCountry(country);
  const baseTime = rule?.processingDays[visaType] ?? 30;
  const multiplier = season === "peak" ? 1.4 : 1.0;
  const min = Math.ceil(baseTime * multiplier);
  const max = min + 8;
  return {
    minDays: min,
    maxDays: max,
    estimate: `${min.toLocaleString("bn-BD")}–${max.toLocaleString("bn-BD")} দিন (আনুমানিক)`,
    peakSeason: season === "peak",
  };
}

export function generateDocumentChecklist(country: string, visaType: string, a: ApplicantProfile): string[] {
  const rule = getCountry(country);
  const list = [...BASE_CHECKLIST];
  if (rule) list.push(...rule.extraDocumentsBn);
  const v = visaType.toLowerCase();
  if (v.includes("work") || v.includes("employ") || v.includes("permit") || v.includes("pass")) {
    list.push("স্বাক্ষরিত চাকরির চুক্তিপত্র", "নিয়োগকর্তার কোম্পানি নিবন্ধন বা ট্রেড লাইসেন্স");
  }
  if (a.married) list.push("বিবাহ সনদ (সত্যায়িত)");
  if ((a.children ?? 0) > 0) list.push("সন্তানদের জন্ম নিবন্ধন সনদ", "পারিবারিক স্পন্সরশিপ বা নির্ভরশীল কাগজপত্র");
  return Array.from(new Set(list));
}

const FIELD_MAPS: Record<string, Record<string, string>> = {
  Spain: {
    passportNo: "numero_pasaporte", fullName: "nombre_completo", nationality: "nacionalidad",
    salary: "ingresos_anuales", jobTitle: "ocupacion", employerName: "nombre_empleador",
  },
  default: {
    passportNo: "passport_no", fullName: "full_name", nationality: "nationality",
    salary: "annual_income", jobTitle: "occupation", employerName: "employer_name",
  },
};

export function mapApplicantToFormFields(country: string, applicant: Record<string, unknown>) {
  const map = FIELD_MAPS[country] ?? FIELD_MAPS.default;
  const out: Record<string, unknown> = {};
  for (const [src, dest] of Object.entries(map)) out[dest] = applicant[src] ?? "";
  return out;
}

export function runFullAssessment(country: string, visaType: string, a: ApplicantProfile) {
  const eligibility = calculateEligibilityScore(country, visaType, a);
  const risk = analyzeRisk(country, a);
  const successProbability = calculateSuccessProbability(eligibility.score, risk.riskScore, country);
  const fee = calculateVisaFee(country, visaType, a.nationality ?? "Bangladesh");
  const timing = predictProcessingTime(country, visaType);
  const checklist = generateDocumentChecklist(country, visaType, a);
  return { eligibility, risk, successProbability, fee, timing, checklist };
}
