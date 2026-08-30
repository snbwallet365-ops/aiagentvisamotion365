export interface CountryRule {
  country: string;
  countryBn: string;
  flag: string;
  currency: string;
  visaTypes: string[];
  visaTypesBn: string[];
  minimumBankBalance: number;
  countryRiskFactor: number; // ০-১০০, বেশি মানে কঠিন
  processingDays: Record<string, number>;
  fees: Record<string, number>;
  employerSponsored: boolean;
  portalUrl: string;
  extraDocuments: string[];
  extraDocumentsBn: string[];
  highlight: string;
  highlightBn: string;
}

export const COUNTRIES: CountryRule[] = [
  {
    country: "Australia", countryBn: "অস্ট্রেলিয়া", flag: "🇦🇺", currency: "AUD",
    visaTypes: ["Work Visa", "Employer-Sponsored (482)", "Student Visa", "Tourist Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "নিয়োগকর্তা স্পন্সরড (৪৮২)", "স্টুডেন্ট ভিসা", "ট্যুরিস্ট ভিসা"],
    minimumBankBalance: 12000, countryRiskFactor: 70,
    processingDays: { "Work Visa": 60, "Employer-Sponsored (482)": 75, "Student Visa": 30, "Tourist Visa": 20 },
    fees: { "Work Visa": 4000, "Employer-Sponsored (482)": 4640, "Student Visa": 650, "Tourist Visa": 145 },
    employerSponsored: true, portalUrl: "https://online.immi.gov.au/lusc/login",
    extraDocuments: ["Skills assessment report", "Employer sponsorship certificate", "IELTS / PTE score"],
    extraDocumentsBn: ["স্কিলস অ্যাসেসমেন্ট রিপোর্ট", "নিয়োগকর্তার স্পন্সরশিপ সনদ", "IELTS বা PTE স্কোর"],
    highlight: "Employer nomination and skills assessment are mandatory.",
    highlightBn: "নিয়োগকর্তার নমিনেশন ও স্কিলস অ্যাসেসমেন্ট বাধ্যতামূলক।",
  },
  {
    country: "Spain", countryBn: "স্পেন", flag: "🇪🇸", currency: "EUR",
    visaTypes: ["Work Visa", "Residence Permit", "Student Visa", "Tourist Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "রেসিডেন্স পারমিট", "স্টুডেন্ট ভিসা", "ট্যুরিস্ট ভিসা"],
    minimumBankBalance: 7000, countryRiskFactor: 60,
    processingDays: { "Work Visa": 90, "Residence Permit": 75, "Student Visa": 45, "Tourist Visa": 15 },
    fees: { "Work Visa": 190, "Residence Permit": 210, "Student Visa": 60, "Tourist Visa": 80 },
    employerSponsored: true, portalUrl: "https://sede.administracionespublicas.gob.es/icpplus/index.html",
    extraDocuments: ["Work authorization from employer", "Social security registration", "Apostilled certificates"],
    extraDocumentsBn: ["নিয়োগকর্তার ওয়ার্ক অথরাইজেশন", "সোশ্যাল সিকিউরিটি নিবন্ধন", "অ্যাপোস্টিল করা সনদপত্র"],
    highlight: "Employer files the authorization before the consular stage.",
    highlightBn: "কনস্যুলার ধাপের আগে নিয়োগকর্তাকে অথরাইজেশন ফাইল করতে হয়।",
  },
  {
    country: "Denmark", countryBn: "ডেনমার্ক", flag: "🇩🇰", currency: "DKK",
    visaTypes: ["Work Visa", "Positive List Scheme", "Student Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "পজিটিভ লিস্ট স্কিম", "স্টুডেন্ট ভিসা"],
    minimumBankBalance: 9000, countryRiskFactor: 75,
    processingDays: { "Work Visa": 60, "Positive List Scheme": 45, "Student Visa": 30 },
    fees: { "Work Visa": 2000, "Positive List Scheme": 4000, "Student Visa": 0 },
    employerSponsored: true, portalUrl: "https://nyidanmark.dk/en-GB/frontpage",
    extraDocuments: ["Employer authorization (SIRI case order ID)", "Salary benchmark evidence"],
    extraDocumentsBn: ["নিয়োগকর্তার অনুমোদন (SIRI কেস অর্ডার আইডি)", "বেতন বেঞ্চমার্কের প্রমাণ"],
    highlight: "A SIRI case order ID is required before submission.",
    highlightBn: "আবেদন জমার আগে SIRI কেস অর্ডার আইডি নিতে হয়।",
  },
  {
    country: "Turkey", countryBn: "তুরস্ক", flag: "🇹🇷", currency: "TRY",
    visaTypes: ["Work Permit", "Tourist Visa"],
    visaTypesBn: ["ওয়ার্ক পারমিট", "ট্যুরিস্ট ভিসা"],
    minimumBankBalance: 4000, countryRiskFactor: 50,
    processingDays: { "Work Permit": 35, "Tourist Visa": 10 },
    fees: { "Work Permit": 8500, "Tourist Visa": 1200 },
    employerSponsored: true, portalUrl: "https://ecalisma.csgb.gov.tr",
    extraDocuments: ["Employer e-Devlet application", "Notarised employment contract"],
    extraDocumentsBn: ["নিয়োগকর্তার e-Devlet আবেদন", "নোটারি করা চাকরির চুক্তি"],
    highlight: "The employer must start the file within 10 days.",
    highlightBn: "নিয়োগকর্তাকে ১০ দিনের মধ্যে ফাইল শুরু করতে হয়।",
  },
  {
    country: "Serbia", countryBn: "সার্বিয়া", flag: "🇷🇸", currency: "EUR",
    visaTypes: ["D-Type Work Visa", "Residence & Work Permit"],
    visaTypesBn: ["ডি-টাইপ ওয়ার্ক ভিসা", "রেসিডেন্স ও ওয়ার্ক পারমিট"],
    minimumBankBalance: 3500, countryRiskFactor: 45,
    processingDays: { "D-Type Work Visa": 30, "Residence & Work Permit": 45 },
    fees: { "D-Type Work Visa": 130, "Residence & Work Permit": 210 },
    employerSponsored: true, portalUrl: "https://welcometoserbia.gov.rs",
    extraDocuments: ["Employer labour market test", "Single permit application"],
    extraDocumentsBn: ["নিয়োগকর্তার লেবার মার্কেট টেস্ট", "সিঙ্গেল পারমিট আবেদন"],
    highlight: "The single permit merges residence and work rights.",
    highlightBn: "সিঙ্গেল পারমিটে বসবাস ও কাজের অনুমতি একসাথে মেলে।",
  },
  {
    country: "New Zealand", countryBn: "নিউজিল্যান্ড", flag: "🇳🇿", currency: "NZD",
    visaTypes: ["Accredited Employer Work Visa", "Student Visa", "Visitor Visa"],
    visaTypesBn: ["অ্যাক্রেডিটেড এমপ্লয়ার ওয়ার্ক ভিসা", "স্টুডেন্ট ভিসা", "ভিজিটর ভিসা"],
    minimumBankBalance: 10000, countryRiskFactor: 68,
    processingDays: { "Accredited Employer Work Visa": 50, "Student Visa": 35, "Visitor Visa": 20 },
    fees: { "Accredited Employer Work Visa": 750, "Student Visa": 375, "Visitor Visa": 246 },
    employerSponsored: true, portalUrl: "https://www.immigration.govt.nz",
    extraDocuments: ["Employer accreditation number", "Job check approval"],
    extraDocumentsBn: ["নিয়োগকর্তার অ্যাক্রেডিটেশন নম্বর", "জব চেক অনুমোদন"],
    highlight: "AEWV requires employer accreditation plus a job check.",
    highlightBn: "AEWV-এর জন্য নিয়োগকর্তার অ্যাক্রেডিটেশন ও জব চেক লাগে।",
  },
  {
    country: "Belarus", countryBn: "বেলারুশ", flag: "🇧🇾", currency: "USD",
    visaTypes: ["Work Visa", "Short-Stay Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "স্বল্পমেয়াদি ভিসা"],
    minimumBankBalance: 2500, countryRiskFactor: 40,
    processingDays: { "Work Visa": 30, "Short-Stay Visa": 12 },
    fees: { "Work Visa": 200, "Short-Stay Visa": 60 },
    employerSponsored: true, portalUrl: "https://mfa.gov.by",
    extraDocuments: ["Special work permit", "Employer invitation letter"],
    extraDocumentsBn: ["বিশেষ ওয়ার্ক পারমিট", "নিয়োগকর্তার আমন্ত্রণপত্র"],
    highlight: "The special work permit is issued to the employer first.",
    highlightBn: "প্রথমে নিয়োগকর্তার নামে বিশেষ ওয়ার্ক পারমিট ইস্যু হয়।",
  },
  {
    country: "Moldova", countryBn: "মলদোভা", flag: "🇲🇩", currency: "EUR",
    visaTypes: ["Long-Stay Work Visa", "Tourist Visa"],
    visaTypesBn: ["দীর্ঘমেয়াদি ওয়ার্ক ভিসা", "ট্যুরিস্ট ভিসা"],
    minimumBankBalance: 2500, countryRiskFactor: 38,
    processingDays: { "Long-Stay Work Visa": 30, "Tourist Visa": 10 },
    fees: { "Long-Stay Work Visa": 110, "Tourist Visa": 60 },
    employerSponsored: true, portalUrl: "https://evisa.gov.md",
    extraDocuments: ["ANOFM labour market approval", "Right-to-work confirmation"],
    extraDocumentsBn: ["ANOFM লেবার মার্কেট অনুমোদন", "কাজের অধিকারের নিশ্চিতকরণ"],
    highlight: "Labour agency approval precedes the visa filing.",
    highlightBn: "ভিসা ফাইলের আগে শ্রম সংস্থার অনুমোদন লাগে।",
  },
  {
    country: "Saudi Arabia", countryBn: "সৌদি আরব", flag: "🇸🇦", currency: "SAR",
    visaTypes: ["Work Visa", "Iqama Transfer", "Visit Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "ইকামা ট্রান্সফার", "ভিজিট ভিসা"],
    minimumBankBalance: 2000, countryRiskFactor: 42,
    processingDays: { "Work Visa": 21, "Iqama Transfer": 14, "Visit Visa": 5 },
    fees: { "Work Visa": 2000, "Iqama Transfer": 6500, "Visit Visa": 300 },
    employerSponsored: true, portalUrl: "https://visa.mofa.gov.sa",
    extraDocuments: ["Enjaz block visa", "Attested education certificates", "GAMCA medical"],
    extraDocumentsBn: ["এনজাজ ব্লক ভিসা", "সত্যায়িত শিক্ষাগত সনদ", "গামকা মেডিকেল"],
    highlight: "Sponsor block visa plus Musaned/Qiwa authentication.",
    highlightBn: "স্পন্সরের ব্লক ভিসা এবং মুসানেদ/কিওয়া সত্যায়ন লাগে।",
  },
  {
    country: "United Arab Emirates", countryBn: "সংযুক্ত আরব আমিরাত", flag: "🇦🇪", currency: "AED",
    visaTypes: ["Work Permit + Residence", "Golden Visa", "Visit Visa"],
    visaTypesBn: ["ওয়ার্ক পারমিট ও রেসিডেন্স", "গোল্ডেন ভিসা", "ভিজিট ভিসা"],
    minimumBankBalance: 3000, countryRiskFactor: 40,
    processingDays: { "Work Permit + Residence": 14, "Golden Visa": 30, "Visit Visa": 3 },
    fees: { "Work Permit + Residence": 5000, "Golden Visa": 9800, "Visit Visa": 350 },
    employerSponsored: true, portalUrl: "https://www.mohre.gov.ae",
    extraDocuments: ["MOHRE offer letter", "Emirates ID application", "Medical fitness test"],
    extraDocumentsBn: ["MOHRE অফার লেটার", "এমিরেটস আইডি আবেদন", "মেডিকেল ফিটনেস টেস্ট"],
    highlight: "MOHRE quota and e-signature card are required.",
    highlightBn: "MOHRE কোটা ও ই-সিগনেচার কার্ড থাকা বাধ্যতামূলক।",
  },
  {
    country: "Qatar", countryBn: "কাতার", flag: "🇶🇦", currency: "QAR",
    visaTypes: ["Work Visa", "Family Visa", "Visit Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "ফ্যামিলি ভিসা", "ভিজিট ভিসা"],
    minimumBankBalance: 2000, countryRiskFactor: 41,
    processingDays: { "Work Visa": 18, "Family Visa": 25, "Visit Visa": 5 },
    fees: { "Work Visa": 1200, "Family Visa": 1000, "Visit Visa": 200 },
    employerSponsored: true, portalUrl: "https://portal.moi.gov.qa",
    extraDocuments: ["Employer sponsorship approval", "Contract attested via QVC"],
    extraDocumentsBn: ["নিয়োগকর্তার স্পন্সরশিপ অনুমোদন", "QVC-তে সত্যায়িত চুক্তি"],
    highlight: "QVC biometrics and medical are done in the home country.",
    highlightBn: "QVC বায়োমেট্রিক ও মেডিকেল দেশেই সম্পন্ন হয়।",
  },
  {
    country: "Bahrain", countryBn: "বাহরাইন", flag: "🇧🇭", currency: "BHD",
    visaTypes: ["Work Visa", "Flexi Permit", "Visit Visa"],
    visaTypesBn: ["ওয়ার্ক ভিসা", "ফ্লেক্সি পারমিট", "ভিজিট ভিসা"],
    minimumBankBalance: 1800, countryRiskFactor: 39,
    processingDays: { "Work Visa": 15, "Flexi Permit": 20, "Visit Visa": 4 },
    fees: { "Work Visa": 172, "Flexi Permit": 449, "Visit Visa": 12 },
    employerSponsored: true, portalUrl: "https://lmra.gov.bh",
    extraDocuments: ["LMRA work permit", "Employer CR copy"],
    extraDocumentsBn: ["LMRA ওয়ার্ক পারমিট", "নিয়োগকর্তার সিআর কপি"],
    highlight: "The LMRA permit comes before visa stamping.",
    highlightBn: "ভিসা স্ট্যাম্পিংয়ের আগে LMRA পারমিট নিতে হয়।",
  },
  {
    country: "Malaysia", countryBn: "মালয়েশিয়া", flag: "🇲🇾", currency: "MYR",
    visaTypes: ["Employment Pass", "Professional Visit Pass", "Tourist Visa"],
    visaTypesBn: ["এমপ্লয়মেন্ট পাস", "প্রফেশনাল ভিজিট পাস", "ট্যুরিস্ট ভিসা"],
    minimumBankBalance: 2500, countryRiskFactor: 45,
    processingDays: { "Employment Pass": 30, "Professional Visit Pass": 21, "Tourist Visa": 5 },
    fees: { "Employment Pass": 1000, "Professional Visit Pass": 500, "Tourist Visa": 100 },
    employerSponsored: true, portalUrl: "https://esd.imi.gov.my",
    extraDocuments: ["ESD employer registration", "Minimum salary evidence"],
    extraDocumentsBn: ["ESD নিয়োগকর্তা নিবন্ধন", "ন্যূনতম বেতনের প্রমাণ"],
    highlight: "ESD company registration and DP10 endorsement are needed.",
    highlightBn: "ESD কোম্পানি নিবন্ধন ও DP10 এন্ডোর্সমেন্ট লাগে।",
  },
  {
    country: "Germany", countryBn: "জার্মানি", flag: "🇩🇪", currency: "EUR",
    visaTypes: ["EU Blue Card", "Skilled Worker Visa", "Job Seeker Visa"],
    visaTypesBn: ["ইইউ ব্লু কার্ড", "স্কিলড ওয়ার্কার ভিসা", "জব সিকার ভিসা"],
    minimumBankBalance: 12000, countryRiskFactor: 72,
    processingDays: { "EU Blue Card": 60, "Skilled Worker Visa": 75, "Job Seeker Visa": 45 },
    fees: { "EU Blue Card": 75, "Skilled Worker Visa": 75, "Job Seeker Visa": 75 },
    employerSponsored: true, portalUrl: "https://digital.diplo.de",
    extraDocuments: ["Anabin degree recognition", "Declaration of employment relationship"],
    extraDocumentsBn: ["Anabin ডিগ্রি স্বীকৃতি", "চাকরির সম্পর্ক ঘোষণাপত্র"],
    highlight: "Anabin recognition drives the approval odds.",
    highlightBn: "Anabin স্বীকৃতিই অনুমোদনের সবচেয়ে বড় নিয়ামক।",
  },
  {
    country: "Canada", countryBn: "কানাডা", flag: "🇨🇦", currency: "CAD",
    visaTypes: ["LMIA Work Permit", "Express Entry PR", "Study Permit"],
    visaTypesBn: ["LMIA ওয়ার্ক পারমিট", "এক্সপ্রেস এন্ট্রি পিআর", "স্টাডি পারমিট"],
    minimumBankBalance: 15000, countryRiskFactor: 74,
    processingDays: { "LMIA Work Permit": 90, "Express Entry PR": 180, "Study Permit": 60 },
    fees: { "LMIA Work Permit": 155, "Express Entry PR": 1365, "Study Permit": 150 },
    employerSponsored: true, portalUrl: "https://www.canada.ca/en/immigration-refugees-citizenship.html",
    extraDocuments: ["Positive LMIA", "ECA credential assessment", "IELTS General"],
    extraDocumentsBn: ["পজিটিভ LMIA", "ECA শিক্ষাগত মূল্যায়ন", "IELTS জেনারেল"],
    highlight: "A positive LMIA is the critical path item.",
    highlightBn: "পজিটিভ LMIA-ই সবচেয়ে গুরুত্বপূর্ণ ধাপ।",
  },
];

export const BASE_CHECKLIST = [
  "বৈধ পাসপোর্ট (কমপক্ষে ৬ মাস মেয়াদ)",
  "পূরণকৃত ভিসা আবেদন ফর্ম",
  "পাসপোর্ট সাইজ ছবি (সাদা ব্যাকগ্রাউন্ড)",
  "ব্যাংক স্টেটমেন্ট (সর্বশেষ ৬ মাস)",
  "চাকরির প্রস্তাবপত্র বা নিয়োগপত্র",
  "শিক্ষাগত সনদ (সত্যায়িত)",
  "স্বাস্থ্য ও ভ্রমণ বীমা",
  "পুলিশ ক্লিয়ারেন্স সনদ",
  "মেডিকেল ফিটনেস সনদ",
  "পূর্ববর্তী ভিসার কপি (যদি থাকে)",
];

export function getCountry(name: string): CountryRule | undefined {
  return COUNTRIES.find((c) => c.country.toLowerCase() === name.toLowerCase() || c.countryBn === name);
}

export function visaTypeBn(country: string, visaType: string) {
  const rule = getCountry(country);
  if (!rule) return visaType;
  const i = rule.visaTypes.indexOf(visaType);
  return i >= 0 ? rule.visaTypesBn[i] : visaType;
}

export const COUNTRY_NAMES = COUNTRIES.map((c) => c.country);
