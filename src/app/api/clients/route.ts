import { db } from "@/db";
import { clients } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
  return Response.json({ clients: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const num = (v: unknown, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : d;
  };
  if (!body.fullName || !body.email) {
    return Response.json({ error: "fullName and email are required" }, { status: 400 });
  }
  const [row] = await db.insert(clients).values({
    fullName: String(body.fullName),
    email: String(body.email),
    phone: String(body.phone ?? ""),
    nationality: String(body.nationality ?? "Bangladesh"),
    passportNo: String(body.passportNo ?? ""),
    passportValidityMonths: num(body.passportValidityMonths, 12),
    age: num(body.age, 28),
    education: String(body.education ?? ""),
    jobTitle: String(body.jobTitle ?? ""),
    employerName: String(body.employerName ?? ""),
    salary: num(body.salary),
    bankBalance: num(body.bankBalance),
    jobOffer: Boolean(body.jobOffer),
    travelHistory: Boolean(body.travelHistory),
    previousRejections: num(body.previousRejections),
    languageProficiency: String(body.languageProficiency ?? ""),
    preferredLanguage: String(body.preferredLanguage ?? "bn"),
    notes: String(body.notes ?? ""),
  }).returning();
  return Response.json({ client: row }, { status: 201 });
}
