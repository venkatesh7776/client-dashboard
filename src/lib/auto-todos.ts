import "server-only";
import { todayIST } from "@/lib/dates";
import { db } from "@/lib/supabase";

/**
 * When a project's start date arrives, put "Start <project>" in Today's to-dos.
 * Idempotent: each (project, start date) gets one to-do, ever — even if you delete it.
 * Runs from the daily cron (just after midnight IST), on Home/To-dos page loads, and when a project is saved.
 */
export async function ensureStartTodos(today: string = todayIST(), projectId?: string): Promise<number> {
  let q = db()
    .from("projects")
    .select("id, project_code, name, priority, status, clients(name)")
    .eq("start_date", today)
    .not("status", "in", "(Completed,Cancelled)");
  if (projectId) q = q.eq("id", projectId);
  const { data: projects, error } = await q;
  if (error || !projects?.length) return 0;

  // Claim the keys first; only keys we newly claim get a to-do.
  const keys = projects.map((p) => ({ key: `start:${p.id}:${today}` }));
  const { data: claimed } = await db().from("auto_todo_keys").upsert(keys, { onConflict: "key", ignoreDuplicates: true }).select("key");
  const fresh = new Set((claimed ?? []).map((k) => k.key));
  const rows = projects
    .filter((p) => fresh.has(`start:${p.id}:${today}`))
    .map((p) => {
      const client = (p.clients as unknown as { name: string } | null)?.name;
      return {
        title: `Start ${p.name}${client && client !== p.name ? ` — ${client}` : ""} (${p.project_code})`.slice(0, 200),
        due_date: today,
        priority: p.priority,
        project_id: p.id,
        auto_key: `start:${p.id}:${today}`,
        notes: "Added automatically — this project starts today.",
        sort_order: 0,
      };
    });
  if (!rows.length) return 0;
  const { error: insErr } = await db().from("todos").insert(rows);
  if (insErr) {
    console.error("ensureStartTodos insert failed", insErr.message);
    // release the keys so the next run can try again
    await db().from("auto_todo_keys").delete().in("key", rows.map((r) => r.auto_key));
    return 0;
  }
  return rows.length;
}
