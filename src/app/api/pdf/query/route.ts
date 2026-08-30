import { retrieve, groundedAnswer } from "@/lib/rag";
import { streamChat, SYSTEM_PROMPT, readKeys, type ChatMessage } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** ৭) কোয়েরি → রিট্রিভাল → LLM সিন্থেসিস (ডকুমেন্ট-গ্রাউন্ডেড স্ট্রিমিং উত্তর) */
export async function POST(request: Request) {
  const keys = readKeys(request);
  const body = (await request.json()) as { query?: string; docIds?: number[]; topK?: number };
  const query = (body.query ?? "").trim();
  if (!query) return Response.json({ error: "query is required" }, { status: 400 });

  const hits = await retrieve(query, body.docIds ?? null, body.topK ?? 5, keys.openrouter);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));

      send({
        type: "sources",
        sources: hits.map((h, i) => ({
          n: i + 1, filename: h.filename, page: h.page,
          score: Math.round(h.score * 1000) / 1000,
          snippet: h.content.slice(0, 220),
        })),
      });

      if (hits.length === 0) {
        const msg = "আপলোড করা ডকুমেন্টে এই প্রশ্নের সাথে মেলে এমন কোনো অংশ পাওয়া যায়নি। অন্যভাবে প্রশ্নটি করুন অথবা প্রাসঙ্গিক PDF আপলোড করুন।";
        send({ type: "delta", text: msg });
        send({ type: "done" });
        controller.close();
        return;
      }

      const context = hits
        .map((h, i) => `[${i + 1}] ${h.filename} — পৃষ্ঠা ${h.page}\n${h.content}`)
        .join("\n\n---\n\n");

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: SYSTEM_PROMPT +
            "\n\nএখন তুমি PDF Space মোডে আছ। শুধুমাত্র নিচে দেওয়া ডকুমেন্টের অংশ থেকে উত্তর দেবে। " +
            "প্রতিটি তথ্যের পাশে [১], [২] আকারে সূত্র নম্বর দেবে। ডকুমেন্টে না থাকলে স্পষ্ট করে বলবে যে তথ্যটি ডকুমেন্টে নেই।",
        },
        { role: "user", content: `ডকুমেন্টের প্রাসঙ্গিক অংশ:\n\n${context}\n\nপ্রশ্ন: ${query}` },
      ];

      try {
        const gen = streamChat(messages, "document-generation", keys, () => groundedAnswer(query, hits));
        while (true) {
          const next = await gen.next();
          if (next.done) break;
          send({ type: "delta", text: next.value });
        }
      } catch {
        send({ type: "delta", text: "\n\n_উত্তর তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।_" });
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
