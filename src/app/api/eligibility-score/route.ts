import { runFullAssessment, mapApplicantToFormFields, type ApplicantProfile } from "@/lib/intelligence";
import { COUNTRIES, getCountry, visaTypeBn } from "@/lib/visa-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    countries: COUNTRIES.map((c) => ({
      country: c.country, countryBn: c.countryBn, flag: c.flag,
      visaTypes: c.visaTypes, visaTypesBn: c.visaTypesBn,
      minimumBankBalance: c.minimumBankBalance, currency: c.currency,
      employerSponsored: c.employerSponsored, highlightBn: c.highlightBn,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    country?: string; visaType?: string; season?: "peak" | "off-peak"; applicant?: ApplicantProfile;
  };
  const country = body.country ?? "Australia";
  const rule = getCountry(country);
  if (!rule) return Response.json({ error: "এই দেশটি এখনও সমর্থিত নয়" }, { status: 400 });

  const visaType = body.visaType ?? rule.visaTypes[0];
  const applicant = body.applicant ?? {};
  const a = runFullAssessment(country, visaType, applicant);

  const verdict =
    a.successProbability >= 70 ? "শক্তিশালী — এখনই আবেদন করা যেতে পারে"
    : a.successProbability >= 45 ? "মাঝারি — কিছু ঘাটতি দূর করে আবেদন করুন"
    : "দুর্বল — আগে প্রোফাইল উন্নত করুন";

  return Response.json({
    country, countryBn: rule.countryBn, flag: rule.flag,
    visaType, visaTypeBn: visaTypeBn(country, visaType),
    score: a.eligibility.score,
    breakdown: {
      পাসপোর্ট: a.eligibility.breakdown.passport,
      "আর্থিক সক্ষমতা": a.eligibility.breakdown.financial,
      "চাকরি ও স্পন্সরশিপ": a.eligibility.breakdown.employment,
      "ভ্রমণ ইতিহাস": a.eligibility.breakdown.travelHistory,
      "শিক্ষা ও ভাষা": a.eligibility.breakdown.education,
    },
    risk: { score: a.risk.riskScore, level: a.risk.riskLevel, redFlags: a.risk.redFlags, mitigations: a.risk.mitigations },
    successProbability: a.successProbability,
    verdict,
    fee: a.fee,
    timing: a.timing,
    checklist: a.checklist,
    recommendations: a.eligibility.recommendations,
    formFields: mapApplicantToFormFields(country, applicant as Record<string, unknown>),
  });
}
