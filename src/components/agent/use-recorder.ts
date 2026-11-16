"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "recording" | "transcribing";

const MAX_SECONDS = 120;

function pickMime(): string | undefined {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
}

/** Records from the mic, then sends the audio to /api/transcribe and returns the text. */
export function useRecorder(onText: (text: string) => void) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings and try again.");
      return;
    }
    const mimeType = pickMime();
    const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const blob = new Blob(chunks, { type: r.mimeType || mimeType || "audio/webm" });
      if (blob.size < 1200) {
        setState("idle");
        setError("Didn't catch that. Hold on a moment longer and try again.");
        return;
      }
      setState("transcribing");
      try {
        const fd = new FormData();
        fd.append("audio", blob, `voice.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const json = (await res.json()) as { text?: string; error?: string };
        if (!res.ok || !json.text) throw new Error(json.error ?? "Couldn't transcribe that.");
        onTextRef.current(json.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't transcribe that.");
      } finally {
        setState("idle");
      }
    };
    rec.current = r;
    r.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS && r.state === "recording") r.stop();
        return s + 1;
      });
    }, 1000);
  }

  function stop() {
    if (rec.current?.state === "recording") rec.current.stop();
  }

  return { state, seconds, error, start, stop };
}
