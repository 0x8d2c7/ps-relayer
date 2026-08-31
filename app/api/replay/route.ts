import { createHmac } from "node:crypto";

import { getConfig, getEvent, updateTarget } from "@/lib/store";

type ReplayBody = {
  id?: unknown;
};

export async function POST(request: Request) {
  let body: ReplayBody;

  try {
    body = (await request.json()) as ReplayBody;
  } catch {
    return Response.json({ error: "Invalid replay" }, { status: 400 });
  }

  if (typeof body.id !== "string") {
    return Response.json({ error: "Invalid replay" }, { status: 400 });
  }

  const event = await getEvent(body.id);

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const { secretKey, targetUrl } = await getConfig();

  if (!secretKey || !targetUrl) {
    return Response.json({ error: "Config not saved" }, { status: 400 });
  }

  // sign fresh for replay
  const signature = createHmac("sha512", secretKey)
    .update(event.rawBody)
    .digest("hex");

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": signature,
      },
      body: event.rawBody,
    });
    await updateTarget(event.id, response.status);

    return Response.json({ status: response.status });
  } catch {
    await updateTarget(event.id, undefined);

    return Response.json({ status: 0 });
  }
}
