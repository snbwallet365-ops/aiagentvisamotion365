import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildPdf, buildDocx, buildDocHtml, buildPrintHtml } from "@/lib/filegen";

export const dynamic = "force-dynamic";

/** হেডারে শুধু ASCII পাঠানো যায়, তাই ASCII নাম + RFC 5987 ইউনিকোড নাম দুটোই তৈরি করি। */
function disposition(title: string, ext: string) {
  const ascii =
    title.replace(/[^A-Za-z0-9\-_ ]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "visamotion-document";
  const utf8 = encodeURIComponent(`${title.slice(0, 60)}.${ext}`);
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${utf8}`;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return new Response("অবৈধ আইডি", { status: 400 });

  const [row] = await db.select().from(documents).where(eq(documents.id, numericId));
  if (!row) return new Response("ডকুমেন্ট পাওয়া যায়নি", { status: 404 });

  const format = (new URL(request.url).searchParams.get("format") ?? "print").toLowerCase();

  if (format === "pdf") {
    const pdf = buildPdf(row.title, row.body);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition(row.title, "pdf"),
      },
    });
  }

  if (format === "docx") {
    const buf = await buildDocx(row.title, row.body);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": disposition(row.title, "docx"),
      },
    });
  }

  if (format === "doc") {
    return new Response(buildDocHtml(row.title, row.body), {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": disposition(row.title, "doc"),
      },
    });
  }

  return new Response(buildPrintHtml(row.title, row.body), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await db.delete(documents).where(eq(documents.id, Number(id)));
  return Response.json({ ok: true });
}
