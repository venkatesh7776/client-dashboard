import { transcribe } from "ai";
import { TRANSCRIBE_MODEL, vertex } from "@/lib/ai/vertex";

export const maxDuration = 60;

/** Voice → text. The browser records audio; Gemini transcribes it. */
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return Response.json({ error: "No audio received" }, { status: 400 });
  if (file.size > 4_000_000) return Response.json({ error: "Recording is too long. Keep it under about 2 minutes." }, { status: 413 });
  try {
    const result = await transcribe({
      model: vertex().transcription(TRANSCRIBE_MODEL),
      audio: new Uint8Array(await file.arrayBuffer()),
    });
    const text = result.text.trim();
    if (!text) return Response.json({ error: "Didn't catch any words. Try again a little closer to the mic." }, { status: 422 });
    return Response.json({ text });
  } catch (e) {
    console.error("transcribe failed", e);
    return Response.json({ error: "Couldn't transcribe that. Please try again." }, { status: 502 });
  }
}
