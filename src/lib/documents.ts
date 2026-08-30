import type { Client } from "@/db/schema";
import { getCountry, visaTypeBn } from "./visa-data";
import { calculateVisaFee, generateDocumentChecklist, predictProcessingTime, runFullAssessment } from "./intelligence";

export const DOCUMENT_KINDS = [
  { key: "cover-letter", labelBn: "ভিসা কভার লেটার", lang: "en", note: "দূতাবাসে জমা দেওয়ার জন্য ইংরেজি" },
  { key: "employment-contract", labelBn: "চাকরির চুক্তিপত্র", lang: "en", note: "নিয়োগকর্তা ও কর্মীর চুক্তি" },
  { key: "sponsorship-letter", labelBn: "স্পন্সরশিপ লেটার", lang: "en", note: "নিয়োগকর্তার অঙ্গীকারনামা" },
  { key: "invoice", labelBn: "ইনভয়েস ও রসিদ", lang: "en", note: "ক্লায়েন্ট বিলিং" },
  { key: "client-profile", labelBn: "ক্লায়েন্ট প্রোফাইল শিট", lang: "en", note: "অভ্যন্তরীণ ফাইল" },
  { key: "document-checklist", labelBn: "ডকুমেন্ট চেকলিস্ট (বাংলা)", lang: "bn", note: "ক্লায়েন্টকে দেওয়ার জন্য" },
  { key: "client-guide", labelBn: "ক্লায়েন্ট নির্দেশিকা (বাংলা)", lang: "bn", note: "ধাপে ধাপে পুরো প্রক্রিয়া" },
  { key: "application-form", labelBn: "আবেদন ফর্ম (অটো-ফিলড)", lang: "en", note: "সরকারি ফর্মের ডাটা শিট" },
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]["key"];

/** দূতাবাসে জমা দেওয়ার ইংরেজি চেকলিস্ট (PDF নিরাপদ)। */
const EN_CHECKLIST = [
  "Valid passport (minimum 6 months validity)",
  "Completed visa application form",
  "Passport-size photographs (white background)",
  "Bank statements (last 6 months)",
  "Employment letter / job offer",
  "Educational certificates (attested)",
  "Health and travel insurance",
  "Police clearance certificate",
  "Medical fitness certificate",
  "Copies of previous visas (if any)",
];

const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const todayBn = () => new Date().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });

export function buildDocument(
  kind: DocumentKind,
  client: Client,
  country: string,
  visaType: string,
): { title: string; body: string; format: string } {
  const rule = getCountry(country);
  const name = client.fullName;
  const bnCountry = rule?.countryBn ?? country;
  const bnVisa = visaTypeBn(country, visaType);

  switch (kind) {
    case "cover-letter":
      return {
        title: `Visa Cover Letter — ${name} (${country})`,
        format: "pdf",
        body: [
          `# VISA APPLICATION COVER LETTER`,
          ``,
          `Date: ${today()}`,
          ``,
          `To: The Visa Section, Embassy of ${country}`,
          `Dhaka, Bangladesh`,
          ``,
          `Dear Sir/Madam,`,
          ``,
          `I, ${name}, holder of passport number ${client.passportNo || "N/A"} issued by ${client.nationality}, respectfully apply for a ${visaType} to ${country}.`,
          ``,
          `## Purpose of travel`,
          `Employment under an offer from ${client.employerName || "the sponsoring employer"} for the position of ${client.jobTitle || "the offered role"}.`,
          ``,
          `## Financial capacity`,
          `I maintain a verified bank balance of USD ${client.bankBalance.toLocaleString("en-US")} and a monthly income of USD ${client.salary.toLocaleString("en-US")}, which meets the requirement of approximately USD ${(rule?.minimumBankBalance ?? 0).toLocaleString("en-US")} for ${country}.`,
          ``,
          `## Documents enclosed`,
          ...EN_CHECKLIST.map((d, i) => `${i + 1}. ${d}`),
          ...(rule?.extraDocuments ?? []).map((d, i) => `${EN_CHECKLIST.length + i + 1}. ${d}`),
          ``,
          `## Declaration`,
          `I confirm that all information provided is true and complete, that I will comply with every condition of the visa, and that I will depart ${country} before the expiry of my authorised stay.`,
          ``,
          `Thank you for considering my application.`,
          ``,
          `Yours faithfully,`,
          ``,
          `${name}`,
          `${client.email} | ${client.phone}`,
        ].join("\n"),
      };

    case "employment-contract":
      return {
        title: `Employment Contract — ${name}`,
        format: "docx",
        body: [
          `# EMPLOYMENT CONTRACT`,
          ``,
          `This Employment Contract is made on ${today()} between:`,
          ``,
          `Employer: ${client.employerName || "[Employer Legal Name]"}`,
          `Registered office: [Address], ${country}`,
          `Registration number: [CR / Trade Licence No.]`,
          ``,
          `AND`,
          ``,
          `Employee: ${name}`,
          `Passport number: ${client.passportNo || "[Passport No.]"}`,
          `Nationality: ${client.nationality}`,
          ``,
          `## 1. POSITION AND SALARY`,
          `| Item | Detail |`,
          `| --- | --- |`,
          `| Position | ${client.jobTitle || "[Job Title]"} |`,
          `| Gross monthly salary | ${client.salary.toLocaleString("en-US")} ${rule?.currency ?? "USD"} |`,
          `| Probation | 3 months |`,
          `| Contract term | 24 months, renewable |`,
          ``,
          `## 2. WORKING HOURS`,
          `Standard hours are 40 per week, Monday to Friday. Overtime is paid according to local labour law.`,
          ``,
          `## 3. LEAVE ENTITLEMENT`,
          `- Annual leave: 21 days`,
          `- Sick leave: 10 days`,
          `- Public holidays as per the ${country} government calendar`,
          ``,
          `## 4. BENEFITS`,
          `- Employer-provided medical insurance`,
          `- Annual return air ticket`,
          `- Accommodation allowance where applicable`,
          ``,
          `## 5. IMMIGRATION UNDERTAKING`,
          `The Employer undertakes to file and fund the ${visaType} sponsorship, including ${rule?.extraDocuments[0] ?? "the required authorisation"}.`,
          ``,
          `## 6. TERMINATION`,
          `Either party may terminate with 30 days written notice. Immediate termination applies in case of gross misconduct.`,
          ``,
          `## SIGNATURES`,
          `Employer: ______________________     Date: ____________`,
          ``,
          `Employee: ______________________     Date: ____________`,
        ].join("\n"),
      };

    case "sponsorship-letter":
      return {
        title: `Employer Sponsorship Letter — ${name}`,
        format: "pdf",
        body: [
          `# EMPLOYER SPONSORSHIP LETTER`,
          ``,
          `Date: ${today()}`,
          ``,
          `To the Immigration Authority of ${country},`,
          ``,
          `${client.employerName || "[Employer Legal Name]"} confirms the sponsorship of ${name} (passport ${client.passportNo || "[No.]"}) for the position of ${client.jobTitle || "[Job Title]"} under the ${visaType} route.`,
          ``,
          `## Undertakings`,
          `1. To fund all government fees, medical examinations and repatriation costs.`,
          `2. To pay a gross monthly salary of ${client.salary.toLocaleString("en-US")} ${rule?.currency ?? "USD"}.`,
          `3. To comply with the requirement: ${rule?.highlight ?? "all sponsorship obligations"}.`,
          `4. To notify the authority of any change in the employment relationship within 10 working days.`,
          ``,
          `Authorised signatory: ______________________`,
          ``,
          `Company stamp:`,
        ].join("\n"),
      };

    case "invoice": {
      const fee = calculateVisaFee(country, visaType, client.nationality);
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(client.id).padStart(4, "0")}`;
      return {
        title: `Invoice ${invoiceNo} — ${name}`,
        format: "pdf",
        body: [
          `# INVOICE`,
          ``,
          `Invoice number: ${invoiceNo}`,
          `Date: ${today()}`,
          ``,
          `Bill to: ${name}`,
          `${client.email} | ${client.phone}`,
          ``,
          `| Description | Amount |`,
          `| --- | --- |`,
          `| ${country} ${visaType} government fee (estimated) | ${fee.governmentFee.toLocaleString("en-US")} ${fee.currency} |`,
          `| Professional consultancy and lodgement service | ${fee.serviceFee} USD |`,
          `| Document preparation, attestation and courier | 90 USD |`,
          `| Automated portal tracking (6 months) | 45 USD |`,
          `| TOTAL service charge | ${fee.serviceFee + 135} USD |`,
          ``,
          `## Payment instructions`,
          `Account name: VisaMOTion Consultancy Ltd.`,
          `Account number: 1234567890 | Bank: ABC Bank | SWIFT: ABCB1234`,
          `bKash / Nagad merchant: 01712-345678`,
          ``,
          `Payment is due within 7 days of the invoice date. Thank you for your business.`,
        ].join("\n"),
      };
    }

    case "client-profile":
      return {
        title: `Client Profile — ${name}`,
        format: "pdf",
        body: [
          `# CLIENT PROFILE SHEET`,
          ``,
          `## Personal information`,
          `| Field | Value |`,
          `| --- | --- |`,
          `| Full name | ${name} |`,
          `| Passport number | ${client.passportNo || "-"} |`,
          `| Nationality | ${client.nationality} |`,
          `| Age | ${client.age} |`,
          `| Email | ${client.email} |`,
          `| Phone | ${client.phone} |`,
          ``,
          `## Visa information`,
          `| Field | Value |`,
          `| --- | --- |`,
          `| Target country | ${country} |`,
          `| Visa type | ${visaType} |`,
          `| Sponsorship route | ${rule?.employerSponsored ? "Employer sponsored" : "Direct application"} |`,
          `| Critical gate | ${rule?.highlight ?? "-"} |`,
          ``,
          `## Employment and finance`,
          `| Field | Value |`,
          `| --- | --- |`,
          `| Job title | ${client.jobTitle || "-"} |`,
          `| Employer | ${client.employerName || "-"} |`,
          `| Monthly salary | USD ${client.salary.toLocaleString("en-US")} |`,
          `| Bank balance | USD ${client.bankBalance.toLocaleString("en-US")} |`,
          `| Required minimum | USD ${(rule?.minimumBankBalance ?? 0).toLocaleString("en-US")} |`,
          ``,
          `## Compliance`,
          `- Passport validity: ${client.passportValidityMonths} months`,
          `- Previous rejections: ${client.previousRejections}`,
          `- International travel history: ${client.travelHistory ? "Yes" : "No"}`,
          `- Education: ${client.education || "-"}`,
          `- Language test: ${client.languageProficiency || "-"}`,
        ].join("\n"),
      };

    case "application-form": {
      const fee = calculateVisaFee(country, visaType, client.nationality);
      const timing = predictProcessingTime(country, visaType);
      return {
        title: `Application Data Sheet — ${name} (${country})`,
        format: "pdf",
        body: [
          `# GOVERNMENT APPLICATION DATA SHEET`,
          ``,
          `Auto-filled by VisaMOTion on ${today()} for portal: ${rule?.portalUrl ?? "-"}`,
          ``,
          `| Form field | Value |`,
          `| --- | --- |`,
          `| surname_given_name | ${name} |`,
          `| passport_no | ${client.passportNo || "-"} |`,
          `| nationality | ${client.nationality} |`,
          `| date_of_birth | [DD/MM/YYYY] |`,
          `| passport_validity_months | ${client.passportValidityMonths} |`,
          `| purpose_of_travel | Employment |`,
          `| occupation | ${client.jobTitle || "-"} |`,
          `| employer_name | ${client.employerName || "-"} |`,
          `| monthly_income_usd | ${client.salary} |`,
          `| financial_capacity_usd | ${client.bankBalance} |`,
          `| visa_subclass | ${visaType} |`,
          `| government_fee | ${fee.governmentFee} ${fee.currency} |`,
          `| expected_processing_days | ${timing.minDays}-${timing.maxDays} |`,
          ``,
          `## Operator notes`,
          `- Verify every field against the original passport before submitting.`,
          `- Upload documents in PDF format, each under 5 MB.`,
          `- Save the tracking number returned by the portal into the application record.`,
        ].join("\n"),
      };
    }

    case "document-checklist":
      return {
        title: `ডকুমেন্ট চেকলিস্ট — ${bnCountry} ${bnVisa}`,
        format: "docx",
        body: [
          `# ${bnCountry} — ${bnVisa} ডকুমেন্ট চেকলিস্ট`,
          ``,
          `তারিখ: ${todayBn()} | আবেদনকারী: ${name}`,
          ``,
          `## প্রয়োজনীয় কাগজপত্র`,
          ...generateDocumentChecklist(country, visaType, {}).map((d, i) => `${i + 1}. ${d}`),
          ``,
          `## দেশভিত্তিক বিশেষ শর্ত`,
          ...(rule?.extraDocumentsBn ?? []).map((d) => `- ${d}`),
          ``,
          `## গুরুত্বপূর্ণ নির্দেশনা`,
          `- প্রতিটি কাগজ পররাষ্ট্র মন্ত্রণালয় থেকে সত্যায়িত করাতে হবে।`,
          `- ব্যাংক স্টেটমেন্টে হঠাৎ বড় অঙ্কের জমা থাকলে উৎসের প্রমাণ রাখুন।`,
          `- সব ডকুমেন্ট স্ক্যান করে PDF আকারে রাখুন, প্রতিটি ৫ মেগাবাইটের কম।`,
          ``,
          `> এই চেকলিস্ট VisaMOTion দ্বারা স্বয়ংক্রিয়ভাবে তৈরি। ফি ও সময় আনুমানিক।`,
        ].join("\n"),
      };

    case "client-guide":
    default: {
      const a = runFullAssessment(country, visaType, {
        age: client.age, nationality: client.nationality, passportValidityMonths: client.passportValidityMonths,
        bankBalance: client.bankBalance, jobOffer: client.jobOffer, salary: client.salary,
        previousRejections: client.previousRejections, travelHistory: client.travelHistory,
        education: client.education, languageProficiency: client.languageProficiency,
      });
      return {
        title: `ক্লায়েন্ট নির্দেশিকা — ${name} (${bnCountry})`,
        format: "docx",
        body: [
          `# ${bnCountry} ${bnVisa} — ধাপে ধাপে নির্দেশিকা`,
          ``,
          `প্রিয় ${name}, আপনার ফাইলের জন্য এই নির্দেশিকা ${todayBn()} তারিখে তৈরি করা হয়েছে।`,
          ``,
          `## আপনার বর্তমান অবস্থা`,
          `| বিষয় | ফলাফল |`,
          `| --- | --- |`,
          `| যোগ্যতা স্কোর | ${a.eligibility.score} / ১০০ |`,
          `| ঝুঁকির মাত্রা | ${a.risk.riskScore} (${a.risk.riskLevel === "LOW" ? "কম" : a.risk.riskLevel === "MEDIUM" ? "মাঝারি" : "বেশি"}) |`,
          `| সফলতার সম্ভাবনা | ${a.successProbability}% (আনুমানিক) |`,
          `| আনুমানিক মোট খরচ | ${a.fee.finalFee.toLocaleString("bn-BD")} ${a.fee.currency} সমতুল্য |`,
          `| আনুমানিক সময় | ${a.timing.minDays}–${a.timing.maxDays} দিন |`,
          ``,
          `## যেসব বিষয় ঠিক করতে হবে`,
          ...(a.risk.redFlags.length ? a.risk.redFlags.map((f) => `- ${f}`) : ["- বড় কোনো ঝুঁকি পাওয়া যায়নি।"]),
          ``,
          `## আমাদের পরামর্শ`,
          ...a.eligibility.recommendations.map((r) => `- ${r}`),
          ``,
          `## প্রক্রিয়ার ধাপ`,
          `১. প্রোফাইল যাচাই ও যোগ্যতা স্কোর নির্ধারণ।`,
          `২. নিয়োগকর্তার স্পন্সরশিপ বা অথরাইজেশন সংগ্রহ।`,
          `৩. সব কাগজ সংগ্রহ ও সত্যায়ন।`,
          `৪. অনলাইন পোর্টালে আবেদন জমা ও ফি পরিশোধ।`,
          `৫. বায়োমেট্রিক ও মেডিকেল অ্যাপয়েন্টমেন্ট।`,
          `৬. সিদ্ধান্তের অপেক্ষা ও পাসপোর্ট সংগ্রহ।`,
          ``,
          `## প্রয়োজনীয় কাগজপত্র`,
          ...a.checklist.map((d, i) => `${i + 1}. ${d}`),
          ``,
          `> যেকোনো প্রশ্নে হোয়াটসঅ্যাপে যোগাযোগ করুন। ফি ও সময় আনুমানিক, দূতাবাসের সিদ্ধান্তের উপর নির্ভরশীল।`,
        ].join("\n"),
      };
    }
  }
}
