import { db } from "@/db";
import { modelUsage } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { FREE_MODELS, TASK_LABEL_BN, TASK_ROUTING, type TaskType } from "@/lib/models";
import { hasAnyProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** ব্যবহারকারীর কাছে কখনও মডেলের আইডি যায় না — শুধু দক্ষতার নাম ও সংখ্যা। */
export async function GET() {
  const byTask = await db
    .select({
      taskType: modelUsage.taskType,
      requests: sql<number>`cast(count(*) as int)`,
      inputTokens: sql<number>`cast(coalesce(sum(${modelUsage.inputTokens}),0) as int)`,
      outputTokens: sql<number>`cast(coalesce(sum(${modelUsage.outputTokens}),0) as int)`,
      avgLatency: sql<number>`cast(coalesce(avg(${modelUsage.latencyMs}),0) as int)`,
    })
    .from(modelUsage)
    .groupBy(modelUsage.taskType)
    .orderBy(desc(sql`count(*)`));

  const totals = byTask.reduce(
    (acc, r) => ({ requests: acc.requests + r.requests, tokens: acc.tokens + r.inputTokens + r.outputTokens }),
    { requests: 0, tokens: 0 },
  );

  const recentRows = await db.select().from(modelUsage).orderBy(desc(modelUsage.createdAt)).limit(24);
  const recent = recentRows.map((r) => ({
    id: r.id,
    skill: TASK_LABEL_BN[r.taskType as TaskType] ?? r.taskType,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    latencyMs: r.latencyMs,
    engine: r.source === "openrouter" ? "ক্লাউড ইঞ্জিন" : "অভ্যন্তরীণ ইঞ্জিন",
    createdAt: r.createdAt,
  }));

  const skills = (Object.keys(TASK_ROUTING) as TaskType[]).map((task) => {
    const stat = byTask.find((b) => b.taskType === task);
    return {
      task,
      label: TASK_LABEL_BN[task],
      specialists: TASK_ROUTING[task].length,
      requests: stat?.requests ?? 0,
      tokens: (stat?.inputTokens ?? 0) + (stat?.outputTokens ?? 0),
      avgLatency: stat?.avgLatency ?? 0,
    };
  });

  const avgSuccess = FREE_MODELS.reduce((s, m) => s + m.successRate, 0) / FREE_MODELS.length;

  return Response.json({
    totals,
    skills,
    recent,
    engineCount: FREE_MODELS.length,
    modalities: {
      text: FREE_MODELS.filter((m) => m.modality === "text").length,
      multimodal: FREE_MODELS.filter((m) => m.modality === "multimodal").length,
      audio: FREE_MODELS.filter((m) => m.modality === "audio").length,
      embedding: FREE_MODELS.filter((m) => m.modality === "embedding").length,
    },
    avgSuccess: Number(avgSuccess.toFixed(1)),
    provider: hasAnyProvider() ? "cloud" : "internal",
  });
}
