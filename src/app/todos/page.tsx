import { MidnightRefresh } from "@/components/midnight-refresh";
import { PageHeader } from "@/components/ui";
import { ensureStartTodos } from "@/lib/auto-todos";
import { getBoardTodos, getFollowUps, getProjectOptions } from "@/lib/data";
import { todayIST } from "@/lib/dates";
import { TodoBoard } from "./todo-board";

export default async function TodosPage() {
  const today = todayIST();
  await ensureStartTodos(today);
  const [todos, followUps, projectOptions] = await Promise.all([
    getBoardTodos(today),
    getFollowUps(today),
    getProjectOptions(),
  ]);
  return (
    <>
      <PageHeader
        title="To-dos"
        description={`${todos.filter((t) => !t.is_done && t.due_date && t.due_date <= today).length} open today · ${todos.filter((t) => !t.is_done).length} open in total`}
      />
      <TodoBoard todos={todos} today={today} followUps={followUps} projectOptions={projectOptions} />
      <MidnightRefresh today={today} />
    </>
  );
}
