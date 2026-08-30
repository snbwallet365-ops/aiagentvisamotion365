import { db } from "@/db";
import { workflowRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { WORKFLOWS, getWorkflow, runWorkflow, ENGINE_MATRIX } from "@/lib/workflows";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const runs = await db.select().from(workflowRuns).orderBy(desc(workflowRuns.createdAt)).limit(40);
  return Response.json({ workflows: WORKFLOWS, runs, matrix: ENGINE_MATRIX });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { key?: string; country?: string; applicationId?: number; engine?: string };
  const def = getWorkflow(body.key ?? "");
  if (!def) return Response.json({ error: "unknown workflow" }, { status: 400 });

  const country = body.country ?? "Australia";
  const engine = body.engine === "playwright-cli" ? "playwright-cli" : def.engine;
  const result = runWorkflow(def, country);

  const [row] = await db.insert(workflowRuns).values({
    workflowKey: def.key,
    country,
    applicationId: body.applicationId ?? null,
    engine,
    status: result.status,
    attempts: result.attempts,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
    steps: result.steps,
    result: result.result,
  }).returning();

  return Response.json({ run: row }, { status: 201 });
}
