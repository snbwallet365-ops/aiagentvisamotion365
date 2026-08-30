import { db } from "@/db";
import { socialPosts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { complete, readKeys } from "@/lib/llm";
import { buildSocialPrompt, parseDraft, templateDraft, type Platform, type Topic } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(50);
  return Response.json({ posts: rows });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    platform?: Platform; topic?: Topic; country?: string; schedule?: boolean; model?: string;
  };
  const platform = (body.platform ?? "linkedin") as Platform;
  const topic = (body.topic ?? "visa-update") as Topic;
  const fallback = templateDraft(platform, topic, body.country);

  const { text, source } = await complete(
    [
      { role: "system", content: "You are a social media strategist for a visa consultancy. Output plain text only." },
      { role: "user", content: buildSocialPrompt(platform, topic, body.country) },
    ],
    "social-copy",
    readKeys(request),
  );

  const draft = source === "openrouter" ? parseDraft(text, fallback) : fallback;

  const [row] = await db.insert(socialPosts).values({
    platform, topic,
    caption: draft.caption,
    hashtags: draft.hashtags,
    callToAction: draft.callToAction,
    status: body.schedule ? "scheduled" : "draft",
    scheduledFor: body.schedule ? new Date(Date.now() + 86400000) : null,
  }).returning();

  return Response.json({ post: row, source }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: number; action?: "publish" | "schedule" };
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });

  const patch =
    body.action === "publish"
      ? {
          status: "published",
          likes: Math.floor(Math.random() * 400) + 40,
          comments: Math.floor(Math.random() * 60) + 3,
          shares: Math.floor(Math.random() * 40) + 2,
          impressions: Math.floor(Math.random() * 9000) + 900,
        }
      : { status: "scheduled", scheduledFor: new Date(Date.now() + 86400000) };

  const [row] = await db.update(socialPosts).set(patch).where(eq(socialPosts.id, body.id)).returning();
  return Response.json({ post: row });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) return Response.json({ error: "id required" }, { status: 400 });
  await db.delete(socialPosts).where(eq(socialPosts.id, id));
  return Response.json({ ok: true });
}
