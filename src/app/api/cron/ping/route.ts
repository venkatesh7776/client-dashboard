import { db } from "@/lib/supabase";

/** Daily Vercel Cron ping so the Supabase Free project never pauses. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { error } = await db().from("clients").select("id", { head: true, count: "exact" });
  return Response.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 500 : 200 });
}
