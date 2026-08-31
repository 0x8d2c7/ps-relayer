import { saveConfig } from "@/lib/store";

type ConfigBody = {
  secretKey?: unknown;
  targetUrl?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConfigBody;

    if (
      typeof body.secretKey !== "string" ||
      !body.secretKey.trim() ||
      typeof body.targetUrl !== "string" ||
      !body.targetUrl.trim()
    ) {
      return Response.json({ error: "Invalid config" }, { status: 400 });
    }

    const targetUrl = new URL(body.targetUrl);

    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return Response.json({ error: "Invalid target URL" }, { status: 400 });
    }

    await saveConfig(body.secretKey.trim(), targetUrl.toString());

    return Response.json({ saved: true });
  } catch {
    return Response.json({ error: "Invalid config" }, { status: 400 });
  }
}
