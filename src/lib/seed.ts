import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  clients, applications, scheduledTasks, socialPosts, workflowRuns, commsLog, conversations, messages,
} from "@/db/schema";
import { runFullAssessment } from "./intelligence";

let seeding: Promise<void> | null = null;

export async function ensureSeed() {
  if (!seeding) seeding = doSeed().catch((e) => { seeding = null; throw e; });
  return seeding;
}

async function doSeed() {
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(clients);
  if (count > 0) return;

  const clientRows = await db.insert(clients).values([
    {
      fullName: "Rahim Uddin Ahmed", email: "rahim.ahmed@example.com", phone: "+8801712345678",
      nationality: "Bangladesh", passportNo: "BR0947213", passportValidityMonths: 34, age: 29,
      education: "মেকানিক্যাল ইঞ্জিনিয়ারিংয়ে স্নাতক", jobTitle: "CNC Machinist", employerName: "Vulcan Metals Pty Ltd",
      salary: 3800, bankBalance: 16500, jobOffer: true, travelHistory: true, previousRejections: 0,
      languageProficiency: "IELTS 6.5", preferredLanguage: "bn",
      notes: "নিয়োগকর্তার নমিনেশন অনুমোদিত। স্কিলস অ্যাসেসমেন্ট ১২ দিন আগে জমা হয়েছে।",
    },
    {
      fullName: "Farhana Akter", email: "farhana.akter@example.com", phone: "+8801811223344",
      nationality: "Bangladesh", passportNo: "BX1183902", passportValidityMonths: 8, age: 26,
      education: "নার্সিংয়ে স্নাতকোত্তর", jobTitle: "Registered Nurse", employerName: "Aalborg Care Group",
      salary: 4200, bankBalance: 6200, jobOffer: true, travelHistory: false, previousRejections: 1,
      languageProficiency: "IELTS 7.0", preferredLanguage: "en",
      notes: "পজিটিভ লিস্ট স্কিমের প্রার্থী। আবেদনের আগে পাসপোর্ট নবায়ন করতে হবে।",
    },
    {
      fullName: "Mohammad Sabbir Hossain", email: "sabbir.hossain@example.com", phone: "+8801933445566",
      nationality: "Bangladesh", passportNo: "BQ7719004", passportValidityMonths: 21, age: 33,
      education: "ইলেকট্রিক্যাল টেকনোলজিতে ডিপ্লোমা", jobTitle: "Site Electrician", employerName: "Al Mansoori Contracting",
      salary: 1450, bankBalance: 3100, jobOffer: true, travelHistory: true, previousRejections: 0,
      languageProficiency: "প্রাথমিক ইংরেজি", preferredLanguage: "bn",
      notes: "MOHRE অফার লেটার স্বাক্ষরিত। গামকা মেডিকেলের তারিখ নির্ধারিত।",
    },
    {
      fullName: "Nusrat Jahan Mim", email: "nusrat.mim@example.com", phone: "+8801622334455",
      nationality: "Bangladesh", passportNo: "BP3320118", passportValidityMonths: 40, age: 24,
      education: "ফিন্যান্সে বিবিএ", jobTitle: "Accounts Executive", employerName: "",
      salary: 900, bankBalance: 4200, jobOffer: false, travelHistory: false, previousRejections: 2,
      languageProficiency: "", preferredLanguage: "bn",
      notes: "উচ্চ ঝুঁকির প্রোফাইল। আবেদনের আগে স্পন্সর নিশ্চিত করতে হবে।",
    },
    {
      fullName: "Tanvir Alam Khan", email: "tanvir.khan@example.com", phone: "+8801544556677",
      nationality: "Bangladesh", passportNo: "BS5540221", passportValidityMonths: 28, age: 31,
      education: "কম্পিউটার সায়েন্সে স্নাতক", jobTitle: "Backend Developer", employerName: "Kuala Systems Sdn Bhd",
      salary: 2600, bankBalance: 9800, jobOffer: true, travelHistory: true, previousRejections: 0,
      languageProficiency: "IELTS 7.5", preferredLanguage: "en",
      notes: "এমপ্লয়মেন্ট পাস ক্যাটাগরি ২। ESD নিবন্ধন সম্পন্ন।",
    },
  ]).returning();

  const plan: { idx: number; country: string; visaType: string; status: string; tracking: string; days: number }[] = [
    { idx: 0, country: "Australia", visaType: "Employer-Sponsored (482)", status: "lodged", tracking: "AUS-482-771204", days: 21 },
    { idx: 1, country: "Denmark", visaType: "Positive List Scheme", status: "documents", tracking: "", days: 10 },
    { idx: 2, country: "United Arab Emirates", visaType: "Work Permit + Residence", status: "biometrics", tracking: "UAE-WP-330119", days: 5 },
    { idx: 3, country: "Canada", visaType: "LMIA Work Permit", status: "intake", tracking: "", days: 30 },
    { idx: 4, country: "Malaysia", visaType: "Employment Pass", status: "approved", tracking: "MYS-EP-908341", days: 2 },
    { idx: 0, country: "New Zealand", visaType: "Accredited Employer Work Visa", status: "assessment", tracking: "NZL-AEWV-114522", days: 14 },
  ];

  for (const p of plan) {
    const c = clientRows[p.idx];
    const a = runFullAssessment(p.country, p.visaType, {
      age: c.age, nationality: c.nationality, passportValidityMonths: c.passportValidityMonths,
      bankBalance: c.bankBalance, jobOffer: c.jobOffer, salary: c.salary,
      previousRejections: c.previousRejections, travelHistory: c.travelHistory,
      education: c.education, languageProficiency: c.languageProficiency,
    });
    await db.insert(applications).values({
      clientId: c.id, country: p.country, visaType: p.visaType, status: p.status, trackingId: p.tracking,
      eligibilityScore: a.eligibility.score, riskScore: a.risk.riskScore, successProbability: a.successProbability,
      feeAmount: a.fee.finalFee, feeCurrency: a.fee.currency, processingEstimate: a.timing.estimate,
      checklist: a.checklist.map((item, i) => ({ item, done: i < 4 })),
      redFlags: a.risk.redFlags, recommendations: a.eligibility.recommendations,
      deadline: new Date(Date.now() + p.days * 86400000),
    });
  }

  await db.insert(scheduledTasks).values([
    { name: "Daily visa news + policy digest", cron: "0 8 * * *", channel: "whatsapp", lastResult: "৫টি দেশের সারাংশ ৫ জন ক্লায়েন্টকে পাঠানো হয়েছে।" },
    { name: "Document deadline reminders", cron: "0 10 * * *", channel: "whatsapp", lastResult: "২টি জরুরি রিমাইন্ডার পাঠানো হয়েছে (৩ দিনের কম সময় বাকি)।" },
    { name: "Client follow-up sequence", cron: "0 14 * * *", channel: "email", lastResult: "৩টি ফলো-আপ ইমেইল সারিতে যোগ হয়েছে।" },
    { name: "Embassy status sweep (agent-browser)", cron: "0 */6 * * *", channel: "automation", lastResult: "৬টি পোর্টাল যাচাই করা হয়েছে, ১টি স্ট্যাটাস পরিবর্তন পাওয়া গেছে।" },
    { name: "Weekly business summary", cron: "0 9 * * 1", channel: "email", lastResult: "সাপ্তাহিক কেপিআই রিপোর্ট ব্যবস্থাপনায় পাঠানো হয়েছে।" },
    { name: "Monthly performance report", cron: "0 9 1 * *", channel: "email", lastResult: "মাসিক রিপোর্ট সংরক্ষণ করা হয়েছে।" },
    { name: "Social media auto-publish", cron: "0 10 * * 2,3,4,5", channel: "social", lastResult: "৪টি পোস্ট লিংকডইন, ইনস্টাগ্রাম, এক্স ও ফেসবুকে প্রকাশিত হয়েছে।" },
  ]);

  await db.insert(socialPosts).values([
    {
      platform: "linkedin", topic: "visa-update", status: "published",
      caption: "🇦🇺 অস্ট্রেলিয়া আবার ৪৮২ ভিসার ন্যূনতম বেতনসীমা বাড়িয়েছে। আপডেটের আগে তৈরি নমিনেশন হলে আবেদনের আগে বেতন পুনরায় যাচাই করতে হবে।\n\nআমাদের অটোমেশন প্রতি ৬ ঘণ্টায় প্রতিটি খোলা নমিনেশন সর্বশেষ সীমার সঙ্গে মিলিয়ে দেখে — নীতি চুপচাপ বদলালেও কোনো ক্লায়েন্ট ক্ষতিগ্রস্ত হয় না।",
      hashtags: ["#AustraliaVisa", "#অস্ট্রেলিয়াভিসা", "#WorkVisa", "#VisaMOTion"],
      callToAction: "ফ্রি যোগ্যতা যাচাই করতে মেসেজ দিন", likes: 184, comments: 27, shares: 19, impressions: 5420,
    },
    {
      platform: "instagram", topic: "success-story", status: "published",
      caption: "✈️ তানভীরের মালয়েশিয়া এমপ্লয়মেন্ট পাস মাত্র ২১ দিনে অনুমোদিত! ইনটেক ইন্টারভিউ থেকে ESD এন্ডোর্সমেন্ট পর্যন্ত প্রতিটি ধাপ আমাদের এআই এজেন্ট ট্র্যাক করেছে। 🇲🇾💼\n\nপরের সফলতা কি আপনার?",
      hashtags: ["#EmploymentPass", "#মালয়েশিয়া", "#VisaApproved", "#VisaMOTion"],
      callToAction: "শুরু করতে ইনবক্সে লিখুন ‘মালয়েশিয়া’", likes: 921, comments: 64, shares: 41, impressions: 12300,
    },
    {
      platform: "x", topic: "recruitment", status: "scheduled",
      caption: "ডেনমার্কের জন্য ৪০ জন সিএনসি মেশিনিস্ট নিয়োগ 🇩🇰 — নিয়োগকর্তা-স্পন্সরড, SIRI কেস অর্ডার আইডি ইতিমধ্যে ইস্যু হয়েছে। বেতন সীমা পূরণ। আবেদন শুক্রবার পর্যন্ত।",
      hashtags: ["#DenmarkJobs", "#বিদেশেচাকরি", "#Hiring"],
      callToAction: "বায়োর লিংকে আবেদন করুন", scheduledFor: new Date(Date.now() + 2 * 86400000),
    },
    {
      platform: "facebook", topic: "educational", status: "draft",
      caption: "🇦🇪 UAE ওয়ার্ক পারমিট প্রসেস ৫ ধাপে:\n1️⃣ MOHRE কোটা\n2️⃣ অফার লেটার সাইন\n3️⃣ এন্ট্রি পারমিট\n4️⃣ মেডিকেল + Emirates ID\n5️⃣ রেসিডেন্স স্ট্যাম্পিং\n\nপ্রতিটি ধাপ আমরা অটোমেটিক ট্র্যাক করি।",
      hashtags: ["#UAEVisa", "#DubaiJobs", "#ওয়ার্কভিসা"],
      callToAction: "কমেন্টে লিখুন ‘দুবাই’",
    },
  ]);

  await db.insert(workflowRuns).values([
    {
      workflowKey: "embassy-login-status", country: "Australia", engine: "agent-browser", status: "success",
      attempts: 8, tokensUsed: 2240, durationMs: 18420,
      steps: [
        { step: "Open portal", command: "agent-browser open $PORTAL_URL", status: "ok", note: "completed", attempt: 1 },
        { step: "Fill credentials", command: "agent-browser fill @e1 $USERNAME", status: "retry", note: "Ref not found → re-snapshot, backoff 1000ms", attempt: 1 },
        { step: "Fill credentials", command: "agent-browser fill @e1 $USERNAME", status: "ok", note: "completed", attempt: 2 },
        { step: "Extract status", command: "agent-browser get text @e6", status: "ok", note: "completed", attempt: 1 },
      ],
      result: "কেস স্ট্যাটাস পাওয়া গেছে: যাচাই চলছে। স্ক্রিনশট সংরক্ষিত। রেফারেন্স AUS-771204।",
    },
    {
      workflowKey: "appointment-booking", country: "United Arab Emirates", engine: "agent-browser", status: "success",
      attempts: 7, tokensUsed: 2100, durationMs: 22110,
      steps: [
        { step: "Open appointment system", command: "agent-browser open $PORTAL_URL", status: "ok", note: "completed", attempt: 1 },
        { step: "Scan availability", command: 'agent-browser query "div.slot-available"', status: "retry", note: "No slots → roll forward 1 day", attempt: 1 },
        { step: "Scan availability", command: 'agent-browser query "div.slot-available"', status: "ok", note: "completed", attempt: 2 },
        { step: "Confirm booking", command: "agent-browser click @e5", status: "ok", note: "completed", attempt: 1 },
      ],
      result: "বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক হয়েছে। রেফারেন্স UAE-330119।",
    },
    {
      workflowKey: "document-download-archive", country: "Canada", engine: "playwright-cli", status: "failed",
      attempts: 9, tokensUsed: 3120, durationMs: 41250,
      steps: [
        { step: "Restore storage state", command: "playwright-cli --state ./auth/state.json open", status: "ok", note: "completed", attempt: 1 },
        { step: "Open My Applications", command: 'playwright-cli click "text=My Applications"', status: "retry", note: "Shadow DOM → frameLocator piercing", attempt: 1 },
        { step: "Open My Applications", command: 'playwright-cli click "text=My Applications"', status: "retry", note: "Expired session → re-auth", attempt: 2 },
        { step: "Open My Applications", command: 'playwright-cli click "text=My Applications"', status: "retry", note: "Escalated", attempt: 3 },
      ],
      result: "\"আমার আবেদন পাতা খোলা\" ধাপে ৩ বার চেষ্টার পরও ব্যর্থ। মানব অপারেটরের কাছে পাঠানো হয়েছে।",
    },
  ]);

  await db.insert(commsLog).values([
    { clientId: clientRows[0].id, channel: "whatsapp", subject: "স্ট্যাটাস আপডেট", body: "আপনার Australia 482 আবেদন এখন 'Under assessment' পর্যায়ে। আনুমানিক সিদ্ধান্ত: ৩০-৪০ দিন।", status: "delivered" },
    { clientId: clientRows[1].id, channel: "email", subject: "জরুরি: পাসপোর্ট নবায়ন প্রয়োজন", body: "আপনার পাসপোর্টের মেয়াদ ৮ মাস। ডেনমার্কে আবেদনের সময় ১২ মাসের বেশি মেয়াদ প্রয়োজন। ফাইল করার আগে নবায়ন করুন।", status: "sent" },
    { clientId: clientRows[2].id, channel: "voice", subject: "স্বয়ংক্রিয় স্ট্যাটাস কল", body: "স্বয়ংক্রিয় কল সম্পন্ন: আগামী মঙ্গলবার সকাল ১০টা ৩০ মিনিটে গুলশানের ইউএই ভিসা সেন্টারে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট নিশ্চিত।", status: "completed" },
    { clientId: clientRows[4].id, channel: "whatsapp", subject: "অনুমোদন", body: "🎉 অভিনন্দন! আপনার মালয়েশিয়া এমপ্লয়মেন্ট পাস অনুমোদিত হয়েছে। পাসপোর্ট সংগ্রহের নির্দেশনা ইমেইলে পাঠানো হয়েছে।", status: "delivered" },
  ]);

  const [conv] = await db.insert(conversations).values({
    title: "ডেনমার্ক পজিটিভ লিস্ট — ফারহানা", language: "bn",
    modelUsed: "visamotion-ai", tokenCount: 1840,
  }).returning();

  await db.insert(messages).values([
    { conversationId: conv.id, role: "user", content: "ফারহানা কি ডেনমার্ক পজিটিভ লিস্ট স্কিমের জন্য যোগ্য?", taskType: "eligibility-reasoning" },
    {
      conversationId: conv.id, role: "assistant", taskType: "eligibility-reasoning",
      model: "visamotion-ai",
      content: "ফারহানার স্কোর মাঝারি পর্যায়ে। নার্সিং ডেনমার্কের পজিটিভ লিস্টে আছে, বেতন ও IELTS শর্ত পূরণ করে। তবে দুটি বাধা রয়েছে:\n\n১. **পাসপোর্টের মেয়াদ ৮ মাস** — ডেনমার্কে আবেদনের সময় ১২ মাসের বেশি প্রয়োজন।\n২. **একটি পূর্ববর্তী রিফিউজাল** — কভার লেটারে ব্যাখ্যা দিতে হবে।\n\nআগে পাসপোর্ট নবায়ন করুন; এরপর সফলতার সম্ভাবনা মাঝারি থেকে শক্তিশালী পর্যায়ে যাবে।",
    },
  ]);
}
