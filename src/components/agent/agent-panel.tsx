"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { ArrowUp, AudioLines, Check, CircleAlert, Loader2, Mic, RotateCcw, Search, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardAgentMessage } from "@/lib/ai/agent";
import { cn } from "@/lib/format";
import { useRecorder } from "./use-recorder";

const SUGGESTIONS = [
  "Add a lead called Acme from LinkedIn, follow up Friday",
  "Record ₹20,000 from Acme by UPI",
  "What did I earn last month?",
  "What needs my attention today?",
];

type ToolOutput = { ok?: boolean; kind?: "read" | "write"; summary?: string; error?: string; link?: string };

export function AgentPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat<DashboardAgentMessage>({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
    onFinish: ({ message }) => {
      // Refresh the page behind the panel when the agent changed something.
      const wrote = message.parts.some((p) => isToolUIPart(p) && p.state === "output-available" && (p.output as ToolOutput)?.kind === "write");
      if (wrote) router.refresh();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  const recorder = useRecorder((text) => {
    setInput((cur) => (cur.trim() ? `${cur.trim()} ${text}` : text));
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  // ⌘J / Ctrl+J toggles the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      clearError();
      sendMessage({ text: t });
      setInput("");
    },
    [busy, clearError, sendMessage],
  );

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open agent (⌘J)"
          title="Ask the agent  ⌘J"
          className="fixed right-4 bottom-20 z-40 flex h-11 items-center gap-2 rounded-full bg-accent pr-4 pl-3.5 text-sm font-medium text-accent-fg shadow-[0_4px_16px_rgba(15,15,15,0.18)] transition-transform hover:scale-[1.03] md:right-6 md:bottom-6"
        >
          <AudioLines size={17} /> Ask
        </button>
      )}

      {open && (
        <aside
          role="dialog"
          aria-label="Agent"
          className="animate-slide-in fixed inset-0 z-50 flex flex-col bg-bg md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:border-l md:border-line md:shadow-[0_0_0_1px_rgba(15,15,15,0.04),0_8px_32px_rgba(15,15,15,0.12)]"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
            <AudioLines size={16} />
            <h2 className="text-[15px] font-semibold">Agent</h2>
            <span className="text-[12px] text-faint">⌘J</span>
            <div className="ml-auto flex items-center gap-0.5">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    stop();
                    setMessages([]);
                    clearError();
                  }}
                  className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg"
                  aria-label="New chat"
                  title="New chat"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg" aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="pt-6">
                <p className="text-[15px] font-medium">What should I do?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Type or tap the mic and say it. I can add and update clients, projects, payments and to-dos, or answer questions about your numbers.
                </p>
                <div className="mt-5 flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-md border border-line px-3 py-2 text-left text-[13px] text-muted transition-colors hover:bg-hover hover:text-fg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-soft px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                        {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="space-y-1.5">
                      {m.parts.map((p, i) => {
                        if (p.type === "text")
                          return p.text ? (
                            <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                              {p.text}
                            </p>
                          ) : null;
                        if (isToolUIPart(p)) return <ToolRow key={i} name={getToolName(p)} state={p.state} output={p.state === "output-available" ? (p.output as ToolOutput) : undefined} errorText={p.state === "output-error" ? p.errorText : undefined} />;
                        return null;
                      })}
                    </div>
                  ),
                )}
                {status === "submitted" && (
                  <div className="flex items-center gap-2 text-[13px] text-muted">
                    <Loader2 size={14} className="animate-spin" /> Thinking…
                  </div>
                )}
                {error && (
                  <div className="rounded-md px-3 py-2 text-[13px]" style={{ background: "var(--tag-red-bg)", color: "var(--tag-red-fg)" }}>
                    Something went wrong. Your message is still in the chat. Try again.
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {recorder.error && <p className="mb-2 text-[12.5px] text-danger">{recorder.error}</p>}
            <div className="rounded-xl border border-line-strong bg-bg focus-within:border-[#2383e2] focus-within:ring-2 focus-within:ring-[#2383e2]/20">
              {recorder.state === "recording" ? (
                <div className="flex h-[60px] items-center gap-2.5 px-3 text-sm">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--tag-red-fg)] opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[var(--tag-red-fg)]" />
                  </span>
                  <span>Listening…</span>
                  <span className="tabular text-muted">{recorder.seconds}s</span>
                  <span className="ml-auto text-[12px] text-faint">Tap stop when done</span>
                </div>
              ) : recorder.state === "transcribing" ? (
                <div className="flex h-[60px] items-center gap-2 px-3 text-sm text-muted">
                  <Loader2 size={15} className="animate-spin" /> Transcribing…
                </div>
              ) : (
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={2}
                  placeholder="Tell me what to do…"
                  className="block max-h-40 w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed outline-none placeholder:text-faint"
                />
              )}
              <div className="flex items-center justify-between px-2 pb-2">
                <button
                  type="button"
                  onClick={recorder.state === "recording" ? recorder.stop : recorder.start}
                  disabled={recorder.state === "transcribing"}
                  aria-label={recorder.state === "recording" ? "Stop recording" : "Speak"}
                  title={recorder.state === "recording" ? "Stop" : "Speak"}
                  className={cn(
                    "grid size-8 place-items-center rounded-full transition-colors disabled:opacity-40",
                    recorder.state === "recording" ? "bg-[var(--tag-red-bg)] text-[var(--tag-red-fg)]" : "text-muted hover:bg-hover hover:text-fg",
                  )}
                >
                  {recorder.state === "recording" ? <Square size={13} fill="currentColor" /> : <Mic size={17} />}
                </button>
                {busy ? (
                  <button type="button" onClick={stop} aria-label="Stop" className="grid size-8 place-items-center rounded-full bg-accent text-accent-fg">
                    <Square size={12} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || recorder.state !== "idle"}
                    aria-label="Send"
                    className="grid size-8 place-items-center rounded-full bg-accent text-accent-fg transition-opacity disabled:opacity-25"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}

function ToolRow({ name, state, output, errorText }: { name: string; state: string; output?: ToolOutput; errorText?: string }) {
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Loader2 size={13} className="animate-spin" /> {LABELS[name] ?? "Working"}…
      </div>
    );
  }
  if (state === "output-error" || (output && output.ok === false)) {
    return (
      <div className="flex items-start gap-2 text-[13px]" style={{ color: "var(--tag-orange-fg)" }}>
        <CircleAlert size={14} className="mt-0.5 shrink-0" />
        <span>{output?.error ?? errorText ?? "That didn't work."}</span>
      </div>
    );
  }
  if (!output) return null;
  if (output.kind === "read") {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-faint">
        <Search size={12} /> {output.summary}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[13px]">
      <Check size={14} className="shrink-0" style={{ color: "var(--tag-green-fg)" }} />
      <span className="min-w-0 flex-1">{output.summary}</span>
      {output.link && (
        <Link href={output.link} className="shrink-0 text-[12.5px] text-muted hover:text-fg hover:underline">
          Open
        </Link>
      )}
    </div>
  );
}

const LABELS: Record<string, string> = {
  searchClients: "Looking up clients",
  getClientDetails: "Opening client",
  addClient: "Adding client",
  updateClient: "Updating client",
  searchProjects: "Looking up projects",
  addProject: "Adding project",
  updateProject: "Updating project",
  recordPayment: "Recording payment",
  searchPayments: "Looking up payments",
  getIncomeSummary: "Checking income",
  addTodo: "Adding to-do",
  listTodos: "Checking to-dos",
  updateTodo: "Updating to-do",
  getOverview: "Checking what needs attention",
};
