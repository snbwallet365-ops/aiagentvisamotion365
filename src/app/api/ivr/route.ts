import { db } from "@/db";
import { applications, clients, commsLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateDocumentChecklist } from "@/lib/intelligence";
import { getCountry, visaTypeBn } from "@/lib/visa-data";

export const dynamic = "force-dynamic";

const MENU = [
  { key: "১", alt: "1", label: "ভিসা স্ট্যাটাস জানতে" },
  { key: "২", alt: "2", label: "ডকুমেন্ট চেকলিস্ট পেতে" },
  { key: "৩", alt: "3", label: "অ্যাপয়েন্টমেন্টের তথ্য" },
  { key: "৪", alt: "4", label: "এজেন্টের সাথে কথা বলতে" },
];

const STATUS_BN: Record<string, string> = {
  intake: "প্রাথমিক পর্যায়ে", documents: "ডকুমেন্ট সংগ্রহ পর্যায়ে", assessment: "যাচাই পর্যায়ে",
  lodged: "দূতাবাসে জমা দেওয়া হয়েছে", biometrics: "বায়োমেট্রিক পর্যায়ে",
  approved: "অনুমোদিত হয়েছে", refused: "প্রত্যাখ্যাত হয়েছে",
};

export async function GET() {
  return Response.json({
    greeting: "VisaMOTion স্বয়ংক্রিয় সহায়তায় স্বাগতম।",
    menu: MENU.map((m) => `${m.key} চাপুন — ${m.label}`),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { clientId?: number; option?: string; callerPhone?: string };
  const option = (body.option ?? "").trim();
  const picked = MENU.find((m) => m.key === option || m.alt === option);

  if (!picked) {
    return Response.json({
      message: ["VisaMOTion স্বয়ংক্রিয় সহায়তায় স্বাগতম।", ...MENU.map((m) => `${m.key} চাপুন — ${m.label}`)].join("\n"),
      nextStep: "await-input",
    });
  }

  let client: typeof clients.$inferSelect | undefined;
  let app: typeof applications.$inferSelect | undefined;
  if (body.clientId) {
    [client] = await db.select().from(clients).where(eq(clients.id, body.clientId));
    if (client) [app] = await db.select().from(applications).where(eq(applications.clientId, client.id));
  }

  const name = client?.fullName ?? "গ্রাহক";
  const rule = app ? getCountry(app.country) : undefined;
  let message: string;
  let nextStep = "await-input";

  if (picked.alt === "1") {
    message = app
      ? `${name}, আপনার ${rule?.countryBn ?? app.country} ${visaTypeBn(app.country, app.visaType)} আবেদনটি ${STATUS_BN[app.status] ?? app.status}। আনুমানিক সময় ${app.processingEstimate}। সফলতার সম্ভাবনা ${app.successProbability.toLocaleString("bn-BD")} শতাংশ।`
      : "অনুগ্রহ করে আপনার ট্র্যাকিং নম্বরটি চাপুন, তারপর হ্যাশ চিহ্ন দিন।";
  } else if (picked.alt === "2") {
    const list = app
      ? generateDocumentChecklist(app.country, app.visaType, {}).slice(0, 6)
      : ["বৈধ পাসপোর্ট", "আবেদন ফর্ম", "ছবি", "ব্যাংক স্টেটমেন্ট", "চাকরির প্রস্তাবপত্র", "শিক্ষাগত সনদ"];
    message = `${name}, আপনার ডকুমেন্ট চেকলিস্ট হোয়াটসঅ্যাপ ও ইমেইলে পাঠানো হয়েছে। প্রধান কাগজপত্র:\n${list.map((d, i) => `${i + 1}. ${d}`).join("\n")}`;
  } else if (picked.alt === "3") {
    message = app
      ? `${name}, আপনার পরবর্তী অ্যাপয়েন্টমেন্ট ${rule?.countryBn ?? app.country} ভিসা সেন্টারে নির্ধারিত। বিস্তারিত সময় ও ঠিকানা এসএমএসে পাঠানো হয়েছে।`
      : "অ্যাপয়েন্টমেন্টের তথ্য পেতে আপনার ট্র্যাকিং নম্বর চাপুন।";
  } else {
    message = "একজন এজেন্টের সাথে সংযোগ করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।";
    nextStep = "transfer-to-agent";
  }

  if (client) {
    await db.insert(commsLog).values({
      clientId: client.id, channel: "voice", direction: "inbound",
      subject: `আইভিআর · ${picked.label}`, body: message, status: "completed",
    });
  }

  return Response.json({ option: picked.key, label: picked.label, message, nextStep });
}
