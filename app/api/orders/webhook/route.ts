import { createHmac, timingSafeEqual } from "node:crypto";

import { getConfig } from "@/lib/store";

type ChargeBody = {
  event?: unknown;
  data?: {
    reference?: unknown;
    amount?: unknown;
    currency?: unknown;
    customer?: {
      email?: unknown;
    };
  };
};

const globalOrders = globalThis as typeof globalThis & {
  paidOrders?: Set<string>;
};

const paidOrders = globalOrders.paidOrders ?? new Set<string>();

globalOrders.paidOrders = paidOrders;

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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const { secretKey } = await getConfig();

  // check signature
  if (!checkSignature(rawBody, signature, secretKey)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: ChargeBody;

  try {
    body = JSON.parse(rawBody) as ChargeBody;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.event !== "charge.success") {
    return Response.json({ ignored: true });
  }

  const reference =
    typeof body.data?.reference === "string" ? body.data.reference : "";

  if (!reference) {
    return Response.json({ error: "Missing reference" }, { status: 400 });
  }

  if (paidOrders.has(reference)) {
    return Response.json({ order: reference, status: "already_paid" });
  }

  paidOrders.add(reference);

  const amount = typeof body.data?.amount === "number" ? body.data.amount : 0;
  const currency =
    typeof body.data?.currency === "string" ? body.data.currency : "NGN";
  const email =
    typeof body.data?.customer?.email === "string"
      ? body.data.customer.email
      : "unknown";

  console.log(
    `[orders] marked paid ${reference} ${amount / 100} ${currency} ${email}`,
  );

  return Response.json({ order: reference, status: "paid" });
}
