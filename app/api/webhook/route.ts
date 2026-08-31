import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { getConfig, saveEvent, type DemoEvent } from "@/lib/store";

type WebhookBody = {
  event?: unknown;
  data?: {
    reference?: unknown;
  };
};

function readWebhook(rawBody: string) {
  try {
    const body = JSON.parse(rawBody) as WebhookBody;

    return {
      event: typeof body.event === "string" ? body.event : "Unknown",
      reference:
        typeof body.data?.reference === "string"
          ? body.data.reference
          : undefined,
    };
  } catch {
    return { event: "Unknown", reference: undefined };
  }
}

function checkSignature(rawBody: string, signature: string, secretKey: string) {
  if (!signature || !secretKey) {
    return false;
  }

  const expected = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);

  return (
    expectedBytes.length === signatureBytes.length &&
    timingSafeEqual(expectedBytes, signatureBytes)
  );
}

async function sendToTarget(
  targetUrl: string,
  rawBody: string,
  contentType: string,
  signature: string,
) {
  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": contentType || "application/json",
        "x-paystack-signature": signature,
      },
      body: rawBody,
    });

    // any reply counts, even a 500 - we just want to show what the target said
    return { targetStatus: response.status };
  } catch {
    return { targetStatus: undefined };
  }
}

export async function POST(request: Request) {
  // read the body as text, not json - the signature covers these exact bytes
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const { secretKey, targetUrl } = await getConfig();
  const { event, reference } = readWebhook(rawBody);
  const signatureValid = checkSignature(rawBody, signature, secretKey);
  const targetResult = targetUrl
    ? await sendToTarget(targetUrl, rawBody, contentType, signature)
    : { targetStatus: undefined };

  const webhookEvent: DemoEvent = {
    id: randomUUID(),
    event,
    reference,
    receivedAt: new Date().toISOString(),
    signatureValid,
    targetStatus: targetResult.targetStatus,
    rawBody,
  };

  await saveEvent(webhookEvent);

  return Response.json({ received: true });
}
