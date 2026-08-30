import { runFullAssessment, mapApplicantToFormFields, type ApplicantProfile } from "@/lib/intelligence";
import { COUNTRIES } from "@/lib/visa-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ countries: COUNTRIES });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    country?: string; visaType?: string; applicant?: ApplicantProfile;
  };
  const country = body.country ?? "Australia";
  const rule = COUNTRIES.find((c) => c.country === country);
  const visaType = body.visaType ?? rule?.visaTypes[0] ?? "Work Visa";
  const applicant = body.applicant ?? {};
  const assessment = runFullAssessment(country, visaType, applicant);
  const formFields = mapApplicantToFormFields(country, applicant as Record<string, unknown>);
  return Response.json({ country, visaType, assessment, formFields });
}
