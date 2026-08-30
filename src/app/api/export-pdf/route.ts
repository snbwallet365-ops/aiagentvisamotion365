import { buildPdf, buildDocx, buildDocHtml, buildPrintHtml } from "@/lib/filegen";

export const dynamic = "force-dynamic";

function disposition(title: string, ext: string) {
  const ascii = title.replace(/[^A-Za-z0-9\-_ ]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "visamotion-document";
  const utf8 = encodeURIComponent(`${title.slice(0, 60)}.${ext}`);
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${utf8}`;
}

/** GET keeps the print view shareable/openable in a new tab. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const title = (sp.get("t") ?? "VisaMOTion Document").slice(0, 90);
  const content = sp.get("c") ?? "";
  if (!content) {
    return new Response(
      buildPrintHtml(title, "> No content was supplied for this preview.\n\nReturn to the app and open the document again."),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  return new Response(buildPrintHtml(title, content), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** চ্যাটের যেকোনো উত্তর সরাসরি PDF / DOCX / DOC ফাইলে রূপান্তর করে। */
export async function POST(request: Request) {
  const body = (await request.json()) as { title?: string; content?: string; format?: string };
  const content = (body.content ?? "").trim();
  if (!content) return Response.json({ error: "content is required" }, { status: 400 });

  const title = (body.title ?? "VisaMOTion Response").slice(0, 90);
  const format = (body.format ?? "pdf").toLowerCase();

  if (format === "docx") {
    const buf = await buildDocx(title, content);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": disposition(title, "docx"),
      },
    });
  }

  if (format === "doc") {
    return new Response(buildDocHtml(title, content), {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": disposition(title, "doc"),
      },
    });
  }

  if (format === "print") {
    return new Response(buildPrintHtml(title, content), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const pdf = buildPdf(title, content);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition(title, "pdf"),
    },
  });
}
