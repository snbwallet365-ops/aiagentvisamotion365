import { db } from "@/db";
import { documents, clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { buildDocument, type DocumentKind } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt)).limit(60);
  return Response.json({ documents: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: DocumentKind; clientId?: number; country?: string; visaType?: string; applicationId?: number;
  };
  if (!body.kind || !body.clientId) {
    return Response.json({ error: "kind and clientId are required" }, { status: 400 });
  }
  const [c] = await db.select().from(clients).where(eq(clients.id, body.clientId));
  if (!c) return Response.json({ error: "client not found" }, { status: 404 });

  const country = body.country ?? "Australia";
  const visaType = body.visaType ?? "Work Visa";
  const doc = buildDocument(body.kind, c, country, visaType);

  const [row] = await db.insert(documents).values({
    clientId: c.id,
    applicationId: body.applicationId ?? null,
    kind: body.kind,
    title: doc.title,
    format: doc.format,
    body: doc.body,
  }).returning();

  return Response.json({ document: row }, { status: 201 });
}
