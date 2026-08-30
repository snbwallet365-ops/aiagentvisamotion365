import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { streamChat, systemFor, estimateTokens, readKeys, type ChatMessage } from "@/lib/llm";
import { runAgent, canvasForAnswer } from "@/lib/agent";
import { TASK_LABEL_BN, type TaskType } from "@/lib/models";
import type { Domain } from "@/lib/expert";

const DOMAIN_BN: Record<Domain, string> = {
  research: "গবেষণা", document: "ডকুমেন্ট", visual: "ভিজ্যুয়াল", web: "ইন্টারফেস",
  data: "ডাটা", code: "কোড", business: "ব্যবসা", content: "কনটেন্ট",
  planning: "পরিকল্পনা", decision: "সিদ্ধান্ত", visa: "ভিসা", general: "সাধারণ",
};

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Body {
  conversationId?: number;
  message: string;
  agentMode?: boolean;
  canvasEnabled?: boolean;
  taskType?: TaskType;
  attachments?: { name: string; size: number; type: string }[];
}

export async function POST(request: Request) {
  const keys = readKeys(request);
  const body = (await request.json()) as Body;
  const userText = (body.message ?? "").trim();
  if (!userText) return Response.json({ error: "বার্তা প্রয়োজন" }, { status: 400 });

  const routed = systemFor(userText);
  const taskType: TaskType = body.taskType ?? routed.task;
  const attachments = body.attachments ?? [];

  let conversationId = body.conversationId;
  if (!conversationId) {
    const [conv] = await db.insert(conversations).values({
      title: userText.slice(0, 60), language: "bn", modelUsed: "visamotion",
    }).returning();
    conversationId = conv.id;
  }

  await db.insert(messages).values({
    conversationId, role: "user", content: userText, taskType, attachments,
  });

  const priorRows = await db.select().from(messages).where(eq(messages.conversationId, conversationId));
  const history: ChatMessage[] = priorRows.slice(-9, -1).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const attachmentNote = attachments.length
    ? `\n\n[সংযুক্ত ফাইল: ${attachments.map((a) => a.name).join(", ")} — এগুলো ভিসা ফাইলের অংশ হিসেবে বিবেচনা করো]`
    : "";

  const encoder = new TextEncoder();
  const convId = conversationId;
  const agentMode = Boolean(body.agentMode);
  const canvasEnabled = Boolean(body.canvasEnabled);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let full = "";
      const skills: string[] = [routed.domain, TASK_LABEL_BN[taskType]];

      try {
        if (agentMode) {
          const gen = runAgent(userText + attachmentNote, history, canvasEnabled, keys);
          while (true) {
            const next = await gen.next();
            if (next.done) { full = next.value; break; }
            const ev = next.value;
            if (ev.type === "delta") full += ev.text;
            send(ev);
          }
        } else {
          send({ type: "phase", key: "think", label: routed.lang === "bn" ? "প্রশ্ন বিশ্লেষণ করা হচ্ছে" : "Understanding the request", phase: "thinking", status: "running" });
          const payload: ChatMessage[] = [
            { role: "system", content: routed.prompt },
            ...history,
            { role: "user", content: userText + attachmentNote },
          ];
          send({ type: "phase", key: "think", label: routed.lang === "bn" ? `${DOMAIN_BN[routed.domain]} বিশেষজ্ঞ নির্বাচিত` : `Routed to the ${routed.domain} specialist`, phase: "thinking", status: "done" });
          send({ type: "phase", key: "write", label: routed.lang === "bn" ? `${TASK_LABEL_BN[taskType]} — উত্তর তৈরি হচ্ছে` : "Composing the answer", phase: "writing", status: "running" });

          const gen = streamChat(payload, taskType, keys);
          while (true) {
            const next = await gen.next();
            if (next.done) break;
            full += next.value;
            send({ type: "delta", text: next.value });
          }
          send({ type: "phase", key: "write", label: routed.lang === "bn" ? "উত্তর প্রস্তুত" : "Answer ready", phase: "writing", status: "done" });

          if (canvasEnabled) {
            const canvas = await canvasForAnswer(userText, full);
            if (canvas) send({ type: "canvas", ...canvas });
          }
        }
      } catch {
        const msg = "\n\n_দুঃখিত, উত্তর তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।_";
        full += msg;
        send({ type: "delta", text: msg });
      }

      await db.insert(messages).values({
        conversationId: convId, role: "assistant", content: full, model: "visamotion", taskType,
      });
      await db.update(conversations).set({
        tokenCount: estimateTokens(full) + estimateTokens(userText),
        modelUsed: agentMode ? "visamotion-agent" : "visamotion",
        updatedAt: new Date(),
      }).where(eq(conversations.id, convId));

      send({ type: "done", conversationId: convId, skills });
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
