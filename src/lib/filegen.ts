import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from "docx";

export type DocFormat = "pdf" | "docx" | "doc" | "html";

interface Block {
  kind: "h1" | "h2" | "p" | "li" | "quote" | "row";
  text: string;
  cells?: string[];
}

/** সাধারণ মার্কডাউনকে ব্লকে ভাঙে (PDF / DOCX / DOC — তিন জেনারেটরই এটি ব্যবহার করে)। */
export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) { out.push({ kind: "p", text: "" }); continue; }
    if (/^\|.*\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      out.push({ kind: "row", text: cells.join(" — "), cells });
      continue;
    }
    if (line.startsWith("## ")) { out.push({ kind: "h2", text: clean(line.slice(3)) }); continue; }
    if (line.startsWith("# ")) { out.push({ kind: "h1", text: clean(line.slice(2)) }); continue; }
    if (line.startsWith("> ")) { out.push({ kind: "quote", text: clean(line.slice(2)) }); continue; }
    if (/^[-*]\s+/.test(line)) { out.push({ kind: "li", text: clean(line.replace(/^[-*]\s+/, "")) }); continue; }
    if (/^\d+[.)]\s+/.test(line)) { out.push({ kind: "li", text: clean(line) }); continue; }
    out.push({ kind: "p", text: clean(line) });
  }
  return out;
}

function clean(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^- \[ \] /, "☐ ");
}

/* ─────────────────────────────  PDF  ───────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const LINE = 15;

function pdfEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Latin-1 এর বাইরের অক্ষর PDF বেস ফন্টে রেন্ডার হয় না — সেগুলো নিরাপদে সরিয়ে দেওয়া হয়। */
function latin1(s: string) {
  let out = "";
  for (const ch of s) out += ch.charCodeAt(0) <= 255 ? ch : "";
  return out.replace(/\s{2,}/g, " ").trim();
}

function wrap(text: string, size: number, bold: boolean, maxWidth: number) {
  const factor = bold ? 0.56 : 0.5;
  const perChar = size * factor;
  const max = Math.max(8, Math.floor(maxWidth / perChar));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur.length) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** নির্ভরতা ছাড়া লেখা একটি ন্যূনতম কিন্তু বৈধ PDF জেনারেটর (Helvetica base-14)। */
export function buildPdf(title: string, body: string): Buffer {
  const blocks = parseBlocks(body);
  const usable = PAGE_W - MARGIN * 2;
  const pages: string[][] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN;

  const newPage = () => { pages.push(ops); ops = []; y = PAGE_H - MARGIN; };
  const ensure = (need: number) => { if (y - need < MARGIN) newPage(); };

  const write = (text: string, size: number, bold: boolean, indent = 0) => {
    const safe = latin1(text);
    if (!safe) { y -= LINE * 0.6; return; }
    for (const line of wrap(safe, size, bold, usable - indent)) {
      ensure(LINE);
      ops.push(
        `BT /${bold ? "F2" : "F1"} ${size} Tf ${MARGIN + indent} ${y.toFixed(2)} Td (${pdfEscape(line)}) Tj ET`,
      );
      y -= size + 4;
    }
  };

  const rule = () => {
    ensure(10);
    ops.push(`0.85 0.85 0.88 RG 0.8 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S`);
    y -= 10;
  };

  write(latin1(title) || "VisaMOTion Document", 17, true);
  rule();

  for (const b of blocks) {
    switch (b.kind) {
      case "h1": y -= 6; write(b.text, 16, true); rule(); break;
      case "h2": y -= 6; write(b.text, 13, true); y -= 2; break;
      case "li": write("•  " + b.text, 10.5, false, 12); break;
      case "quote": write(b.text, 10, false, 18); break;
      case "row": {
        const cells = b.cells ?? [];
        write(cells.join("   |   "), 10.5, false, 6);
        break;
      }
      default: write(b.text, 10.5, false);
    }
  }
  pages.push(ops);

  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;

  pages.forEach((content, i) => {
    const pageId = 4 + i * 2;
    const streamId = pageId + 1;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 ${4 + pages.length * 2} 0 R >> >> /Contents ${streamId} 0 R >>`;
    const stream = content.join("\n");
    objects[streamId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });
  objects[4 + pages.length * 2] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue;
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  const maxId = objects.length;
  pdf += `xref\n0 ${maxId}\n0000000000 65535 f \n`;
  for (let i = 1; i < maxId; i++) {
    pdf += offsets[i] ? `${String(offsets[i]).padStart(10, "0")} 00000 n \n` : `0000000000 65535 f \n`;
  }
  pdf += `trailer\n<< /Size ${maxId} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

/* ─────────────────────────────  DOCX  ───────────────────────────── */

const FONT = "Nirmala UI";

export async function buildDocx(title: string, body: string): Promise<Buffer> {
  const blocks = parseBlocks(body);
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: title, bold: true, size: 32, font: FONT })],
    }),
  ];

  let tableBuffer: string[][] = [];
  const flushTable = () => {
    if (!tableBuffer.length) return;
    const cols = Math.max(...tableBuffer.map((r) => r.length));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableBuffer.map((cells, ri) =>
          new TableRow({
            children: Array.from({ length: cols }, (_, ci) =>
              new TableCell({
                margins: { top: 60, bottom: 60, left: 90, right: 90 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 2, color: "E4E7EC" },
                  bottom: { style: BorderStyle.SINGLE, size: 2, color: "E4E7EC" },
                  left: { style: BorderStyle.SINGLE, size: 2, color: "E4E7EC" },
                  right: { style: BorderStyle.SINGLE, size: 2, color: "E4E7EC" },
                },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cells[ci] ?? "", bold: ri === 0, size: 21, font: FONT })],
                  }),
                ],
              }),
            ),
          }),
        ),
      }),
    );
    children.push(new Paragraph({ text: "", spacing: { after: 120 } }));
    tableBuffer = [];
  };

  for (const b of blocks) {
    if (b.kind === "row") { tableBuffer.push(b.cells ?? [b.text]); continue; }
    flushTable();
    switch (b.kind) {
      case "h1":
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: b.text, bold: true, size: 28, font: FONT })],
        }));
        break;
      case "h2":
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: b.text, bold: true, size: 24, font: FONT })],
        }));
        break;
      case "li":
        children.push(new Paragraph({
          bullet: { level: 0 }, spacing: { after: 40 },
          children: [new TextRun({ text: b.text, size: 21, font: FONT })],
        }));
        break;
      case "quote":
        children.push(new Paragraph({
          indent: { left: 400 }, spacing: { after: 80 },
          children: [new TextRun({ text: b.text, italics: true, size: 20, font: FONT, color: "475467" })],
        }));
        break;
      default:
        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: b.text, size: 21, font: FONT })],
        }));
    }
  }
  flushTable();

  const doc = new Document({
    creator: "VisaMOTion",
    title,
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

/* ─────────────────────────  DOC (Word HTML)  ───────────────────────── */

export function buildDocHtml(title: string, body: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const blocks = parseBlocks(body);
  const parts: string[] = [];
  let inTable = false;
  let inList = false;
  const closeTable = () => { if (inTable) { parts.push("</table>"); inTable = false; } };
  const closeList = () => { if (inList) { parts.push("</ul>"); inList = false; } };

  for (const b of blocks) {
    if (b.kind === "row") {
      closeList();
      if (!inTable) { parts.push('<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">'); inTable = true; }
      parts.push(`<tr>${(b.cells ?? []).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`);
      continue;
    }
    closeTable();
    if (b.kind === "li") {
      if (!inList) { parts.push("<ul>"); inList = true; }
      parts.push(`<li>${esc(b.text)}</li>`);
      continue;
    }
    closeList();
    if (b.kind === "h1") parts.push(`<h1>${esc(b.text)}</h1>`);
    else if (b.kind === "h2") parts.push(`<h2>${esc(b.text)}</h2>`);
    else if (b.kind === "quote") parts.push(`<blockquote>${esc(b.text)}</blockquote>`);
    else if (b.text) parts.push(`<p>${esc(b.text)}</p>`);
    else parts.push("<p>&nbsp;</p>");
  }
  closeTable();
  closeList();

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${esc(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>@page{size:A4;margin:2cm}body{font-family:'Nirmala UI','Segoe UI',Arial,sans-serif;font-size:11pt;line-height:1.6;color:#101828}
h1{font-size:16pt;border-bottom:1.5pt solid #101828;padding-bottom:6pt}h2{font-size:12.5pt;color:#344054}
td{border:0.5pt solid #d0d5dd;padding:5pt;font-size:10.5pt}blockquote{color:#475467;border-left:3pt solid #d0d5dd;padding-left:10pt}</style>
</head><body><h1>${esc(title)}</h1>${parts.join("\n")}</body></html>`;
}

/* ─────────────────────────  A4 প্রিন্ট প্রিভিউ  ───────────────────────── */

export function buildPrintHtml(title: string, body: string): string {
  const inner = buildDocHtml(title, body)
    .replace(/^[\s\S]*?<body>/, "")
    .replace(/<\/body>[\s\S]*$/, "");
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@page{size:A4;margin:20mm}
*{box-sizing:border-box}
body{font-family:'Hind Siliguri','Nirmala UI','Segoe UI',system-ui,sans-serif;color:#101828;line-height:1.7;
 max-width:820px;margin:0 auto;padding:40px 32px 80px;background:#fff}
h1{font-size:22px;border-bottom:2px solid #101828;padding-bottom:10px;letter-spacing:-.01em}
h2{font-size:15px;margin-top:26px;text-transform:none;color:#344054}
p,li{font-size:14px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13.5px}
td{border:1px solid #e4e7ec;padding:8px 10px}
tr:first-child td{background:#f9fafb;font-weight:600}
blockquote{border-left:3px solid #d0d5dd;margin:12px 0;padding:4px 14px;color:#475467}
.bar{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);
 border-bottom:1px solid #ececf1;padding:10px 16px;display:flex;gap:8px;justify-content:flex-end}
.bar button,.bar a{font:500 13px/1 'Hind Siliguri',sans-serif;padding:8px 14px;border-radius:10px;
 border:1px solid #ececf1;background:#fff;cursor:pointer;text-decoration:none;color:#101828}
.bar button:first-child{background:#101828;color:#fff;border-color:#101828}
@media print{.bar{display:none}body{padding:0;max-width:none}}
</style></head><body>
<div class="bar"><button onclick="window.print()">প্রিন্ট / PDF সংরক্ষণ</button></div>
${inner}
</body></html>`;
}
