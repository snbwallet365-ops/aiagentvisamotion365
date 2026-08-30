import { db } from "@/db";
import { commsLog, clients, applications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { complete, readKeys } from "@/lib/llm";

export const dynamic = "force-dynamic";

export const CHANNELS = ["whatsapp", "email", "voice", "messenger", "instagram", "sms"] as const;

export async function GET() {
  await ensureSeed();
  const rows = await db
    .select({ log: commsLog, client: clients })
    .from(commsLog)
    .leftJoin(clients, eq(commsLog.clientId, clients.id))
    .orderBy(desc(commsLog.createdAt))
    .limit(50);
  return Response.json({ logs: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientId?: number; channel?: string; intent?: string; custom?: string;
  };
  if (!body.clientId || !body.channel) {
    return Response.json({ error: "clientId and channel are required" }, { status: 400 });
  }
  const [c] = await db.select().from(clients).where(eq(clients.id, body.clientId));
  if (!c) return Response.json({ error: "client not found" }, { status: 404 });

  const apps = await db.select().from(applications).where(eq(applications.clientId, c.id));
  const app = apps[0];
  const channel = body.channel;
  const intent = body.intent ?? "status-update";
  const bangla = true;

  let bodyText = body.custom ?? "";
  if (!bodyText) {
    const prompt = `ভিসা ক্লায়েন্ট ${c.fullName}-এর জন্য একটি ${channel} বার্তা লেখো (উদ্দেশ্য: ${intent})।
দেশ: ${app?.country ?? "নির্ধারিত নয়"}; ভিসা: ${app?.visaType ?? "নির্ধারিত নয়"}; পর্যায়: ${app?.status ?? "প্রাথমিক"};
সফলতার সম্ভাবনা ${(app?.successProbability ?? 0).toLocaleString("bn-BD")}%; প্রসেসিং ${app?.processingEstimate ?? "অজানা"}।
${channel === "voice" ? "এটি ৯০ শব্দের মধ্যে বলার উপযোগী ভয়েস স্ক্রিপ্ট হবে।" : "১২০ শব্দের মধ্যে রাখো।"}
সম্পূর্ণ বাংলায় লেখো। শুধু সাধারণ টেক্সট, কোনো মার্কডাউন নয়।`;
    const { text, source } = await complete(
      [{ role: "system", content: "তুমি VisaMOTion। ভিসা এজেন্সির ক্লায়েন্ট বার্তা শুধু বাংলায় লেখো।" }, { role: "user", content: prompt }],
      channel === "voice" ? "voice-script" : "multilingual",
      readKeys(request),
    );
    bodyText = source === "openrouter" ? text : localTemplate(channel, intent, c.fullName, app, bangla);
  }

  const [row] = await db.insert(commsLog).values({
    clientId: c.id, channel, direction: "outbound",
    subject: `${intent} · ${app?.country ?? "General"}`,
    body: bodyText,
    status: channel === "voice" ? "completed" : "delivered",
  }).returning();

  return Response.json({ log: row }, { status: 201 });
}

function localTemplate(
  channel: string, intent: string, name: string,
  app: { country: string; visaType: string; status: string; successProbability: number; processingEstimate: string } | undefined,
  bn: boolean,
) {
  const country = app?.country ?? "your destination";
  const STAGE_BN: Record<string, string> = {
    intake: "প্রাথমিক", documents: "ডকুমেন্ট সংগ্রহ", assessment: "যাচাই চলছে",
    lodged: "জমা দেওয়া", biometrics: "বায়োমেট্রিক", approved: "অনুমোদিত", refused: "প্রত্যাখ্যাত",
  };
  const stage = STAGE_BN[app?.status ?? "intake"] ?? "প্রাথমিক";
  if (channel === "voice") {
    return bn
      ? `হ্যালো ${name}, এটি VisaMOTion-এর স্বয়ংক্রিয় কল। আপনার ${country} ${app?.visaType ?? "ভিসা"} আবেদনটি এখন "${stage}" পর্যায়ে রয়েছে। আনুমানিক সময় ${app?.processingEstimate ?? "শীঘ্রই"}। বিস্তারিত জানতে ১ চাপুন, এজেন্টের সাথে কথা বলতে ৪ চাপুন। ধন্যবাদ।`
      : `Hello ${name}, this is an automated call from VisaMOTion. Your ${country} ${app?.visaType ?? "visa"} application is now at the "${stage}" stage, with an estimated ${app?.processingEstimate ?? "standard"} processing window. Press 1 for details, press 4 to speak with an agent. Thank you.`;
  }
  if (intent === "document-request") {
    return bn
      ? `প্রিয় ${name}, আপনার ${country} ফাইলের জন্য কিছু ডকুমেন্ট বাকি আছে। অনুগ্রহ করে ৪৮ ঘণ্টার মধ্যে আপলোড করুন যাতে লজমেন্টে দেরি না হয়। — VisaMOTion`
      : `Dear ${name}, a few documents are still outstanding for your ${country} file. Please upload them within 48 hours so lodgement is not delayed. — VisaMOTion`;
  }
  return bn
    ? `প্রিয় ${name}, আপনার ${country} ${app?.visaType ?? "ভিসা"} আবেদন এখন "${stage}" পর্যায়ে। সাফল্যের সম্ভাবনা ${app?.successProbability ?? 0}%। আনুমানিক সিদ্ধান্ত: ${app?.processingEstimate ?? "শীঘ্রই"}। প্রশ্ন থাকলে এই মেসেজের উত্তর দিন। — VisaMOTion`
    : `Dear ${name}, your ${country} ${app?.visaType ?? "visa"} application is at the "${stage}" stage. Current success probability: ${app?.successProbability ?? 0}%. Estimated decision window: ${app?.processingEstimate ?? "soon"}. Reply to this message with any questions. — VisaMOTion`;
}
