import { db } from "@/db";
import { pdfDocs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ingestPdf, deleteDoc, MAX_PDF_BYTES } from "@/lib/rag";
import { readKeys } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const docs = await db.select().from(pdfDocs).orderBy(desc(pdfDocs.createdAt));
  return Response.json({ docs });
}

/** ইনজেশন → ভ্যালিডেশন → এক্সট্রাকশন → চাঙ্কিং → এমবেডিং → সংরক্ষণ */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart payload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return Response.json({ error: "Only PDF files are accepted." }, { status: 415 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json({ error: "File exceeds the 20MB limit." }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await ingestPdf(file.name, bytes, readKeys(request).openrouter);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "PDF processing failed.";
    return Response.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return Response.json({ error: "id required" }, { status: 400 });
  const [row] = await db.select().from(pdfDocs).where(eq(pdfDocs.id, id));
  if (!row) return Response.json({ error: "not found" }, { status: 404 });
  await deleteDoc(id);
  return Response.json({ ok: true });
}
