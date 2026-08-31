import { clearEvents, getEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getEvents());
}

export async function DELETE() {
  await clearEvents();

  return Response.json({ cleared: true });
}
