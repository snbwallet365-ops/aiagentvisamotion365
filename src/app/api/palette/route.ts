import { buildPalette } from "@/lib/expert";

export const dynamic = "force-dynamic";

const HEX = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

export async function GET(request: Request) {
  const base = new URL(request.url).searchParams.get("base") ?? "#2f6bff";
  if (!HEX.test(base)) return Response.json({ error: "Provide a valid hex colour, e.g. #2f6bff" }, { status: 400 });
  return Response.json(buildPalette(base));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { base?: string };
  const base = (body.base ?? "").trim();
  if (!HEX.test(base)) return Response.json({ error: "Provide a valid hex colour, e.g. #2f6bff" }, { status: 400 });
  return Response.json(buildPalette(base), { status: 201 });
}
