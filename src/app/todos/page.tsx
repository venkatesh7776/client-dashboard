import { MidnightRefresh } from "@/components/midnight-refresh";
import { PageHeader } from "@/components/ui";
import { getBoardTodos, getFollowUps, getProjectOptions } from "@/lib/data";
import { todayIST } from "@/lib/dates";
import { TodoBoard } from "./todo-board";

export default async function TodosPage() {
  const today = todayIST();
  const [todos, followUps, projectOptions] = await Promise.all([
    getBoardTodos(today),
    getFollowUps(today),
    getProjectOptions(),
  ]);
  return (
    <>
      <PageHeader title="To-dos" description="Plan today, tomorrow, the day after, and later." />
      <TodoBoard todos={todos} today={today} followUps={followUps} projectOptions={projectOptions} />
      <MidnightRefresh today={today} />
    </>
  );
}
