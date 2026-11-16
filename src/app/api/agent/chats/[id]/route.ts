import { deleteChat, getChat } from "@/lib/ai/chats";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const chat = await getChat((await params).id);
  return chat ? Response.json(chat) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await deleteChat((await params).id);
  return Response.json({ ok: true });
}
