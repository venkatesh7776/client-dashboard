import { after } from "next/server";
import { consumeStream, createAgentUIStreamResponse, createIdGenerator } from "ai";
import { createDashboardAgent, type DashboardAgentMessage } from "@/lib/ai/agent";
import { getChat, saveChat, titleFrom } from "@/lib/ai/chats";

export const maxDuration = 300;

/**
 * The client sends only its new message; history lives in the database.
 * Progress is saved after every step, and the stream is consumed server-side,
 * so the agent keeps working (and saving) even if the tab is closed.
 */
export async function POST(request: Request) {
  const { id, message } = (await request.json()) as { id: string; message: DashboardAgentMessage };
  if (!id || !message) return Response.json({ error: "Missing chat id or message" }, { status: 400 });

  const existing = await getChat(id);
  if (existing?.status === "running") {
    return Response.json({ error: "The agent is still working on your previous message." }, { status: 409 });
  }
  const messages = [...((existing?.messages ?? []) as DashboardAgentMessage[]), message];
  await saveChat(id, { messages, status: "running", ...(existing ? {} : { title: titleFrom(message) }) });

  let finish: () => void = () => {};
  const finished = new Promise<void>((resolve) => (finish = resolve));
  after(() => finished); // keep the function alive until the run is saved

  return createAgentUIStreamResponse({
    agent: createDashboardAgent(),
    uiMessages: messages,
    originalMessages: messages,
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    consumeSseStream: consumeStream,
    onUIMessageStepEnd: async ({ messages: all }) => {
      await saveChat(id, { messages: all, status: "running" });
    },
    onEnd: async ({ messages: all }) => {
      await saveChat(id, { messages: all, status: "idle" });
      finish();
    },
    onError: (error) => {
      console.error("agent run failed", error);
      void saveChat(id, { status: "error" }).finally(finish);
      return "Something went wrong while working on that. Please try again.";
    },
  });
}
