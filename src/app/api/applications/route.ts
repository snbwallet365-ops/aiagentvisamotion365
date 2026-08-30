import { db } from "@/db";
import { applications, clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { runFullAssessment } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db
    .select({ application: applications, client: clients })
    .from(applications)
    .leftJoin(clients, eq(applications.clientId, clients.id))
    .orderBy(desc(applications.createdAt));
  return Response.json({ applications: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { clientId?: number; country?: string; visaType?: string };
  if (!body.clientId || !body.country || !body.visaType) {
    return Response.json({ error: "clientId, country and visaType are required" }, { status: 400 });
  }
  const [c] = await db.select().from(clients).where(eq(clients.id, body.clientId));
  if (!c) return Response.json({ error: "client not found" }, { status: 404 });

  const a = runFullAssessment(body.country, body.visaType, {
    age: c.age, nationality: c.nationality, passportValidityMonths: c.passportValidityMonths,
    bankBalance: c.bankBalance, jobOffer: c.jobOffer, salary: c.salary,
    previousRejections: c.previousRejections, travelHistory: c.travelHistory,
    education: c.education, languageProficiency: c.languageProficiency,
  });

  const [row] = await db.insert(applications).values({
    clientId: c.id, country: body.country, visaType: body.visaType, status: "intake",
    eligibilityScore: a.eligibility.score, riskScore: a.risk.riskScore,
    successProbability: a.successProbability, feeAmount: a.fee.finalFee, feeCurrency: a.fee.currency,
    processingEstimate: a.timing.estimate,
    checklist: a.checklist.map((item) => ({ item, done: false })),
    redFlags: a.risk.redFlags, recommendations: a.eligibility.recommendations,
    deadline: new Date(Date.now() + 21 * 86400000),
  }).returning();

  return Response.json({ application: row, assessment: a }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: number; status?: string; trackingId?: string; checklistIndex?: number };
  if (!body.id) return Response.json({ error: "id is required" }, { status: 400 });
  const [existing] = await db.select().from(applications).where(eq(applications.id, body.id));
  if (!existing) return Response.json({ error: "not found" }, { status: 404 });

  const checklist = [...existing.checklist];
  if (typeof body.checklistIndex === "number" && checklist[body.checklistIndex]) {
    checklist[body.checklistIndex] = {
      ...checklist[body.checklistIndex],
      done: !checklist[body.checklistIndex].done,
    };
  }

  const [row] = await db.update(applications).set({
    status: body.status ?? existing.status,
    trackingId: body.trackingId ?? existing.trackingId,
    checklist,
    updatedAt: new Date(),
  }).where(eq(applications.id, body.id)).returning();

  return Response.json({ application: row });
}
