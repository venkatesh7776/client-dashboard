import { listChats } from "@/lib/ai/chats";

export async function GET() {
  return Response.json({ chats: await listChats() });
}
