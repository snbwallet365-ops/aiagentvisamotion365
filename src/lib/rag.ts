import { db } from "@/db";
import { pdfChunks, pdfDocs } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export const MAX_PDF_BYTES = 20 * 1024 * 1024; // ২০ মেগাবাইট
export const CHUNK_TOKENS = 500;
export const CHUNK_OVERLAP = 100;
const CHARS_PER_TOKEN = 4;
export const EMBED_DIM = 384;

/* ───────────────  1) টেক্সট এক্সট্রাকশন  ─────────────── */

export interface ExtractResult { pages: string[]; text: string }

export async function extractPdf(bytes: Uint8Array): Promise<ExtractResult> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return { pages, text: pages.join("\n\n") };
}

/* ───────────────  2) সেম্যান্টিক চাঙ্কিং  ─────────────── */

export interface Chunk { index: number; page: number; content: string }

/** ৫০০ টোকেনের চাঙ্ক, ১০০ টোকেন ওভারল্যাপ — পেজ সীমানা পেরিয়েও প্রসঙ্গ ধরে রাখে। */
export function chunkPages(pages: string[]): Chunk[] {
  const size = CHUNK_TOKENS * CHARS_PER_TOKEN;
  const overlap = CHUNK_OVERLAP * CHARS_PER_TOKEN;
  const chunks: Chunk[] = [];
  let index = 0;

  // পেজ নম্বর ধরে রাখতে প্রতিটি অক্ষরের সাথে পেজ ম্যাপ করি
  const marks: { start: number; page: number }[] = [];
  let joined = "";
  pages.forEach((p, i) => {
    marks.push({ start: joined.length, page: i + 1 });
    joined += (p ?? "").replace(/\s+\n/g, "\n").trim() + "\n\n";
  });
  const clean = joined.trim();
  if (!clean) return [];

  const pageAt = (pos: number) => {
    let page = 1;
    for (const m of marks) if (pos >= m.start) page = m.page;
    return page;
  };

  let start = 0;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + size);
    if (end < clean.length) {
      // বাক্যের শেষে কাটার চেষ্টা করি
      const window = clean.slice(end - 220, end);
      const cut = Math.max(window.lastIndexOf("। "), window.lastIndexOf(". "), window.lastIndexOf("\n"));
      if (cut > 40) end = end - 220 + cut + 1;
    }
    const content = clean.slice(start, end).trim();
    if (content.length > 30) chunks.push({ index: index++, page: pageAt(start), content });
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

/* ───────────────  3) ভেক্টর এমবেডিং  ─────────────── */

function hash32(s: string, seed: number) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length > 1);
}

/**
 * নির্ভরতাহীন হ্যাশিং-ভিত্তিক এমবেডিং (ইউনিগ্রাম + বাইগ্রাম, sub-linear TF)।
 * ক্লাউড এমবেডিং সার্ভিস না থাকলেও কসাইন সিমিলারিটি সার্চ নির্ভুল থাকে।
 */
export function embedLocal(text: string): number[] {
  const vec = new Array(EMBED_DIM).fill(0);
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    counts.set(tokens[i], (counts.get(tokens[i]) ?? 0) + 1);
    if (i > 0) {
      const bi = `${tokens[i - 1]}_${tokens[i]}`;
      counts.set(bi, (counts.get(bi) ?? 0) + 1);
    }
  }
  for (const [term, tf] of counts) {
    const weight = 1 + Math.log(tf);
    for (let k = 0; k < 3; k++) {
      const h = hash32(term, k * 7919);
      const idx = h % EMBED_DIM;
      const sign = (h >>> 16) % 2 === 0 ? 1 : -1;
      vec[idx] += sign * weight;
    }
  }
  return vec;
}

/** ক্লাউড এমবেডিং থাকলে সেটি, না হলে অভ্যন্তরীণ এমবেডিং। */
export async function embed(texts: string[], userKey?: string): Promise<number[][]> {
  const key = userKey ?? process.env.OPENROUTER_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://visamotion.ai",
          "X-Title": "VisaMOTion",
        },
        body: JSON.stringify({ model: "nvidia/nemotron-3-embed-1b:free", input: texts }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { embedding?: number[] }[] };
        const out = (json.data ?? []).map((d) => d.embedding ?? []);
        if (out.length === texts.length && out.every((v) => v.length > 0)) return out;
      }
    } catch { /* অভ্যন্তরীণ এমবেডিংয়ে ফিরে যাই */ }
  }
  return texts.map(embedLocal);
}

export function norm(v: number[]) {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
}

export function cosine(a: number[], an: number, b: number[], bn: number) {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot / (an * bn);
}

/* ───────────────  4-5) ইনজেশন ও সংরক্ষণ  ─────────────── */

export interface IngestResult {
  docId: number; pages: number; chars: number; chunkCount: number; preview: string;
}

export async function ingestPdf(filename: string, bytes: Uint8Array, userKey?: string): Promise<IngestResult> {
  const { pages, text } = await extractPdf(bytes);
  const chunks = chunkPages(pages);
  if (chunks.length === 0) throw new Error("এই PDF থেকে কোনো টেক্সট পাওয়া যায়নি (সম্ভবত স্ক্যান করা ছবি)।");

  const [doc] = await db.insert(pdfDocs).values({
    filename,
    sizeBytes: bytes.byteLength,
    pages: pages.length,
    chars: text.length,
    chunkCount: chunks.length,
    status: "processing",
    summary: text.slice(0, 400).replace(/\s+/g, " ").trim(),
  }).returning();

  const vectors = await embed(chunks.map((c) => c.content), userKey);
  await db.insert(pdfChunks).values(
    chunks.map((c, i) => ({
      docId: doc.id,
      chunkIndex: c.index,
      page: c.page,
      content: c.content,
      embedding: vectors[i],
      norm: norm(vectors[i]),
    })),
  );

  await db.update(pdfDocs).set({ status: "ready" }).where(eq(pdfDocs.id, doc.id));

  return {
    docId: doc.id,
    pages: pages.length,
    chars: text.length,
    chunkCount: chunks.length,
    preview: text.slice(0, 400).replace(/\s+/g, " ").trim(),
  };
}

/* ───────────────  6) কোয়েরি রিট্রিভাল  ─────────────── */

export interface Hit { docId: number; filename: string; page: number; score: number; content: string }

export async function retrieve(query: string, docIds: number[] | null, topK = 5, userKey?: string): Promise<Hit[]> {
  const [qv] = await embed([query], userKey);
  const qn = norm(qv);

  const rows = docIds && docIds.length
    ? await db.select().from(pdfChunks).where(inArray(pdfChunks.docId, docIds))
    : await db.select().from(pdfChunks);
  if (rows.length === 0) return [];

  const docs = await db.select().from(pdfDocs);
  const nameOf = new Map(docs.map((d) => [d.id, d.filename]));

  return rows
    .map((r) => ({
      docId: r.docId,
      filename: nameOf.get(r.docId) ?? "ডকুমেন্ট",
      page: r.page,
      score: cosine(qv, qn, r.embedding, r.norm || norm(r.embedding)),
      content: r.content,
    }))
    .filter((h) => h.score > 0.01)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function deleteDoc(id: number) {
  await db.delete(pdfChunks).where(eq(pdfChunks.docId, id));
  await db.delete(pdfDocs).where(eq(pdfDocs.id, id));
}

/* ───────────────  7) অভ্যন্তরীণ গ্রাউন্ডেড সিন্থেসিস  ─────────────── */

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[।.!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 25)
    // সব-বড়-হাতের ছোট শিরোনাম বাদ দিই, যেন উত্তরে শুধু তথ্যবহুল বাক্য থাকে
    .filter((s) => !(s.length < 70 && s === s.toUpperCase() && /[A-Z]/.test(s)));
}

/**
 * ক্লাউড ইঞ্জিন না থাকলে রিট্রিভ করা চাঙ্ক থেকেই এক্সট্রাক্টিভ উত্তর তৈরি করে —
 * প্রতিটি বাক্যের পাশে সূত্র নম্বর ও পৃষ্ঠা থাকে, ডকুমেন্টের বাইরের কিছু যোগ করে না।
 */
export function groundedAnswer(query: string, hits: Hit[]): string {
  if (hits.length === 0) {
    return "আপলোড করা ডকুমেন্টে এই প্রশ্নের সাথে মেলে এমন কোনো অংশ পাওয়া যায়নি।";
  }

  const qTerms = new Set(tokenize(query));
  const scored: { text: string; n: number; page: number; file: string; score: number }[] = [];

  hits.forEach((h, i) => {
    for (const sent of splitSentences(h.content)) {
      const terms = tokenize(sent);
      if (terms.length === 0) continue;
      let overlap = 0;
      for (const t of new Set(terms)) if (qTerms.has(t)) overlap += 1;
      const numeric = /\d/.test(sent) ? 0.6 : 0;
      const score = overlap / Math.sqrt(terms.length) + numeric * (qTerms.size > 0 ? 0.4 : 0);
      if (score > 0) scored.push({ text: sent, n: i + 1, page: h.page, file: h.filename, score });
    }
  });

  scored.sort((a, b) => b.score - a.score);
  const picked: typeof scored = [];
  for (const s of scored) {
    if (picked.some((p) => p.text === s.text)) continue;
    picked.push(s);
    if (picked.length >= 6) break;
  }

  if (picked.length === 0) {
    const first = hits[0];
    return [
      `## ডকুমেন্ট থেকে প্রাপ্ত তথ্য`,
      ``,
      `প্রশ্নের সাথে সরাসরি মিল পাওয়া যায়নি, তবে সবচেয়ে প্রাসঙ্গিক অংশটি নিচে দেওয়া হলো:`,
      ``,
      `> ${first.content.slice(0, 500)}`,
      ``,
      `**সূত্র:** [১] ${first.filename} — পৃষ্ঠা ${first.page}`,
    ].join("\n");
  }

  const bn = (n: number) => n.toLocaleString("bn-BD");
  const usedSources = Array.from(new Set(picked.map((p) => p.n))).sort();

  return [
    `## ডকুমেন্ট থেকে উত্তর`,
    ``,
    ...picked.map((p) => `- ${p.text} **[${bn(p.n)}]**`),
    ``,
    `## সূত্র`,
    ...usedSources.map((n) => {
      const h = hits[n - 1];
      return `- **[${bn(n)}]** ${h.filename} — পৃষ্ঠা ${bn(h.page)} (মিল ${Math.round(h.score * 100)}%)`;
    }),
    ``,
    `> এই উত্তরের প্রতিটি তথ্য শুধুমাত্র আপলোড করা ডকুমেন্ট থেকে নেওয়া হয়েছে। ডকুমেন্টের বাইরের কোনো তথ্য যোগ করা হয়নি।`,
  ].join("\n");
}
