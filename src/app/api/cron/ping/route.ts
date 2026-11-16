import { ensureStartTodos } from "@/lib/auto-todos";
import { db } from "@/lib/supabase";

/**
 * Daily Vercel Cron (00:05 IST):
 *  - adds "Start <project>" to Today for projects starting today
 *  - pings Supabase so the Free project never pauses
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const added = await ensureStartTodos();
  const { error } = await db().from("clients").select("id", { head: true, count: "exact" });
  return Response.json({ ok: !error, startTodosAdded: added, at: new Date().toISOString() }, { status: error ? 500 : 200 });
}
