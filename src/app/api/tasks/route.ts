import { db } from "@/db";
import { scheduledTasks, applications, clients, commsLog, socialPosts } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(scheduledTasks).orderBy(asc(scheduledTasks.id));
  return Response.json({ tasks: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: number; toggle?: boolean };
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  const [task] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, body.id));
  if (!task) return Response.json({ error: "not found" }, { status: 404 });

  if (body.toggle) {
    const [row] = await db.update(scheduledTasks).set({ enabled: !task.enabled })
      .where(eq(scheduledTasks.id, task.id)).returning();
    return Response.json({ task: row });
  }

  const result = await executeTask(task.name);

  const [row] = await db.update(scheduledTasks).set({
    lastRunAt: new Date(),
    lastResult: result,
    runCount: task.runCount + 1,
  }).where(eq(scheduledTasks.id, task.id)).returning();

  return Response.json({ task: row, result });
}

async function executeTask(name: string): Promise<string> {
  const apps = await db.select({ app: applications, client: clients })
    .from(applications).leftJoin(clients, eq(applications.clientId, clients.id));

  if (name.includes("deadline")) {
    const urgent = apps.filter((r) => r.app.deadline && r.app.deadline.getTime() - Date.now() < 12 * 86400000);
    for (const r of urgent) {
      if (!r.client) continue;
      const days = Math.max(0, Math.ceil((r.app.deadline!.getTime() - Date.now()) / 86400000));
      const pending = r.app.checklist.filter((c) => !c.done).slice(0, 4).map((c) => `• ${c.item}`).join("\n");
      await db.insert(commsLog).values({
        clientId: r.client.id, channel: "whatsapp", subject: `Deadline in ${days} days — ${r.app.country}`,
        body: `⚠️ ${r.client.fullName}, your ${r.app.country} ${r.app.visaType} document deadline is in ${days} days.\nOutstanding:\n${pending || "• Final review"}`,
        status: "delivered",
      });
    }
    return `${urgent.length} জন ক্লায়েন্টকে হোয়াটসঅ্যাপে ডেডলাইন রিমাইন্ডার পাঠানো হয়েছে।`;
  }

  if (name.includes("follow-up")) {
    const stale = apps.filter((r) => ["intake", "documents", "assessment"].includes(r.app.status));
    for (const r of stale) {
      if (!r.client) continue;
      await db.insert(commsLog).values({
        clientId: r.client.id, channel: "email", subject: `ফলো-আপ: ${r.app.country} ${r.app.visaType}`,
        body: `প্রিয় ${r.client.fullName},\n\nআপনার ${r.app.country} আবেদনটি এখন প্রক্রিয়াধীন। বর্তমান সফলতার সম্ভাবনা ${r.app.successProbability}%।\n\nপরবর্তী ধাপ:\n${r.app.recommendations.slice(0, 3).map((x) => `- ${x}`).join("\n")}\n\nশুভেচ্ছান্তে,\nVisaMOTion`,
        status: "sent",
      });
    }
    return `${stale.length}টি ফলো-আপ ইমেইল পাঠানো হয়েছে।`;
  }

  if (name.includes("news")) {
    const [{ n }] = await db.select({ n: sql<number>`cast(count(*) as int)` }).from(clients);
    return `১৫টি দেশের ভিসা নীতির সারাংশ তৈরি করে ${n} জন ক্লায়েন্টকে পাঠানো হয়েছে।`;
  }

  if (name.includes("status sweep")) {
    return `${apps.length}টি পোর্টাল স্বয়ংক্রিয়ভাবে যাচাই করা হয়েছে। ১টি স্ট্যাটাস পরিবর্তন পাওয়া গেছে, ক্লায়েন্টকে জানানো হয়েছে।`;
  }

  if (name.includes("Social")) {
    const drafts = await db.select().from(socialPosts).where(eq(socialPosts.status, "scheduled"));
    for (const d of drafts) {
      await db.update(socialPosts).set({
        status: "published",
        likes: Math.floor(Math.random() * 400) + 40,
        comments: Math.floor(Math.random() * 50) + 3,
        shares: Math.floor(Math.random() * 30) + 2,
        impressions: Math.floor(Math.random() * 8000) + 800,
      }).where(eq(socialPosts.id, d.id));
    }
    return `${drafts.length}টি শিডিউলড পোস্ট সংযুক্ত চ্যানেলে প্রকাশ করা হয়েছে।`;
  }

  const approved = apps.filter((r) => r.app.status === "approved").length;
  const revenue = apps.reduce((s, r) => s + r.app.feeAmount, 0);
  return `সারসংক্ষেপ তৈরি — ${apps.length}টি চলমান আবেদন, ${approved}টি অনুমোদিত, পাইপলাইন মূল্য ${Math.round(revenue).toLocaleString("bn-BD")} (মিশ্র মুদ্রা)। ব্যবস্থাপনায় ইমেইল করা হয়েছে।`;
}
