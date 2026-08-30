import { db } from "@/db";
import { applications, clients, workflowRuns, modelUsage, commsLog, socialPosts, documents } from "@/db/schema";
import { desc, eq, gte, sql } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { FREE_MODELS } from "@/lib/models";
import { hasAnyProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

const STATUS_BN: Record<string, string> = {
  intake: "প্রাথমিক", documents: "ডকুমেন্ট সংগ্রহ", assessment: "যাচাই চলছে",
  lodged: "জমা দেওয়া", biometrics: "বায়োমেট্রিক", approved: "অনুমোদিত", refused: "প্রত্যাখ্যাত",
};

/** সিস্টেম হেলথ, পাইপলাইন ও ব্যর্থ ওয়ার্কফ্লো মনিটরিং। */
export async function GET() {
  await ensureSeed();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const byStatus = await db
    .select({
      status: applications.status,
      count: sql<number>`cast(count(*) as int)`,
      avgSeconds: sql<number>`cast(coalesce(avg(extract(epoch from (${applications.updatedAt} - ${applications.createdAt}))),0) as int)`,
    })
    .from(applications)
    .groupBy(applications.status);

  const byCountry = await db
    .select({
      country: applications.country,
      count: sql<number>`cast(count(*) as int)`,
      avgScore: sql<number>`cast(coalesce(avg(${applications.eligibilityScore}),0) as int)`,
      value: sql<number>`cast(coalesce(sum(${applications.feeAmount}),0) as int)`,
    })
    .from(applications)
    .groupBy(applications.country)
    .orderBy(desc(sql`count(*)`));

  const failedRuns = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.status, "failed"))
    .orderBy(desc(workflowRuns.createdAt))
    .limit(10);

  const [usage] = await db
    .select({
      requests: sql<number>`cast(count(*) as int)`,
      tokens: sql<number>`cast(coalesce(sum(${modelUsage.inputTokens} + ${modelUsage.outputTokens}),0) as int)`,
      avgLatency: sql<number>`cast(coalesce(avg(${modelUsage.latencyMs}),0) as int)`,
    })
    .from(modelUsage)
    .where(gte(modelUsage.createdAt, dayAgo));

  const counts = async (t: Parameters<typeof db.select>[0] extends never ? never : never) => t;
  void counts;

  const [[cl], [rn], [cm], [sp], [dc]] = await Promise.all([
    db.select({ n: sql<number>`cast(count(*) as int)` }).from(clients),
    db.select({ n: sql<number>`cast(count(*) as int)` }).from(workflowRuns),
    db.select({ n: sql<number>`cast(count(*) as int)` }).from(commsLog),
    db.select({ n: sql<number>`cast(count(*) as int)` }).from(socialPosts),
    db.select({ n: sql<number>`cast(count(*) as int)` }).from(documents),
  ]);

  const totalRuns = rn?.n ?? 0;
  const successRuns = totalRuns - failedRuns.length;

  return Response.json({
    health: {
      database: "সক্রিয়",
      aiEngine: hasAnyProvider() ? "ক্লাউড ইঞ্জিন সংযুক্ত" : "অভ্যন্তরীণ ইঞ্জিন",
      engineCount: FREE_MODELS.length,
      automation: "প্রস্তুত",
    },
    pipeline: byStatus.map((r) => ({
      status: r.status,
      statusBn: STATUS_BN[r.status] ?? r.status,
      count: r.count,
      avgHours: Math.round((r.avgSeconds / 3600) * 10) / 10,
    })),
    countries: byCountry,
    failedWorkflows: failedRuns.map((r) => ({
      id: r.id, workflow: r.workflowKey, country: r.country,
      attempts: r.attempts, result: r.result, at: r.createdAt,
    })),
    usage24h: usage ?? { requests: 0, tokens: 0, avgLatency: 0 },
    totals: {
      clients: cl?.n ?? 0,
      workflowRuns: totalRuns,
      workflowSuccessRate: totalRuns ? Math.round((successRuns / totalRuns) * 100) : 100,
      messages: cm?.n ?? 0,
      socialPosts: sp?.n ?? 0,
      documents: dc?.n ?? 0,
    },
    timestamp: new Date().toISOString(),
  });
}
