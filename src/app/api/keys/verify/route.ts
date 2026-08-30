export const dynamic = "force-dynamic";

/** ব্যবহারকারীর কী যাচাই — কী কখনও সংরক্ষণ করা হয় না, শুধু একবার পরীক্ষা করা হয়। */
export async function POST(request: Request) {
  const body = (await request.json()) as { provider?: string; key?: string };
  const key = (body.key ?? "").trim();
  const provider = body.provider;
  if (!key) return Response.json({ ok: false, reason: "empty key" }, { status: 400 });

  try {
    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/key", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return Response.json({ ok: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` });
    }

    if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return Response.json({ ok: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` });
    }

    if (provider === "exa") {
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify({ query: "visa policy", numResults: 1 }),
      });
      return Response.json({ ok: res.ok, reason: res.ok ? undefined : `HTTP ${res.status}` });
    }

    return Response.json({ ok: false, reason: "unknown provider" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, reason: "network unreachable" });
  }
}
