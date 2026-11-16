"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronUp,
  CircleAlert,
  History,
  Loader2,
  Mic,
  Minus,
  Plus,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type Mode = "closed" | "open" | "min";
type ServerStatus = "idle" | "running" | "error";
type ChatSummary = { id: string; title: string; status: ServerStatus; updated_at: string };

const MODE_KEY = "agent-mode";
const CHAT_KEY = "agent-chat-id";

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function textOf(m: DashboardAgentMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
}

export function AgentPanel() {
  const router = useRouter();
  const [mode, setModeState] = useState<Mode>("closed");
  const [chatId, setChatId] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("idle");
  const [view, setView] = useState<"chat" | "history">("chat");
  const [history, setHistory] = useState<ChatSummary[] | null>(null);
  const [input, setInput] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    store(MODE_KEY, m);
  }, []);

  // restore which chat and panel state this device had
  useEffect(() => {
    const id = read(CHAT_KEY) ?? newId();
    store(CHAT_KEY, id);
    setChatId(id);
    const m = read(MODE_KEY) as Mode | null;
    if (m === "open" || m === "min") setModeState(m);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<DashboardAgentMessage>({
        api: "/api/agent",
        // history lives on the server; only send the new message
        prepareSendMessagesRequest: ({ messages, id }) => ({ body: { id, message: messages[messages.length - 1] } }),
      }),
    [],
  );

  const { messages, setMessages, sendMessage, status, error, clearError } = useChat<DashboardAgentMessage>({
    id: chatId ?? undefined,
    transport,
    onFinish: ({ message }) => {
      setServerStatus("idle");
      const wrote = message.parts.some((p) => isToolUIPart(p) && p.state === "output-available" && (p.output as ToolOutput)?.kind === "write");
      if (wrote) router.refresh();
    },
  });

  const streaming = status === "submitted" || status === "streaming";
  const busy = streaming || serverStatus === "running";

  // Load the saved conversation (and keep polling while a background run is still going).
  const load = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/agent/chats/${id}`, { cache: "no-store" });
        if (res.status === 404) {
          setMessages([]);
          setServerStatus("idle");
          return "idle" as ServerStatus;
        }
        if (!res.ok) throw new Error();
        const chat = (await res.json()) as { messages: DashboardAgentMessage[]; status: ServerStatus };
        setMessages(chat.messages);
        setServerStatus(chat.status);
        setLoadError(null);
        return chat.status;
      } catch {
        setLoadError("Couldn't load this chat.");
        return "error" as ServerStatus;
      }
    },
    [setMessages],
  );

  useEffect(() => {
    if (chatId && !streaming) void load(chatId);
    // only when the chat changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (!chatId || streaming || serverStatus !== "running") return;
    const t = setInterval(async () => {
      const s = await load(chatId);
      if (s !== "running") {
        clearInterval(t);
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(t);
  }, [chatId, streaming, serverStatus, load, router]);

  const recorder = useRecorder((text) => {
    setInput((cur) => (cur.trim() ? `${cur.trim()} ${text}` : text));
    requestAnimationFrame(() => inputRef.current?.focus());
  });

  // ⌘J / Ctrl+J toggles the panel; Esc minimises it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setMode(mode === "open" ? "closed" : "open");
      }
      if (e.key === "Escape" && mode === "open") setMode("min");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  useEffect(() => {
    if (mode === "open" && view === "chat") requestAnimationFrame(() => inputRef.current?.focus());
  }, [mode, view]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, mode, view]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy || !chatId) return;
      clearError();
      setServerStatus("running");
      sendMessage({ text: t });
      setInput("");
    },
    [busy, chatId, clearError, sendMessage],
  );

  async function openHistory() {
    setView("history");
    setHistory(null);
    try {
      const res = await fetch("/api/agent/chats", { cache: "no-store" });
      setHistory(((await res.json()) as { chats: ChatSummary[] }).chats);
    } catch {
      setHistory([]);
    }
  }

  function switchTo(id: string) {
    store(CHAT_KEY, id);
    setChatId(id);
    setView("chat");
  }

  function startNew() {
    if (streaming) return;
    const id = newId();
    setMessages([]);
    setServerStatus("idle");
    switchTo(id);
  }

  async function removeChat(id: string) {
    await fetch(`/api/agent/chats/${id}`, { method: "DELETE" });
    setHistory((h) => h?.filter((c) => c.id !== id) ?? null);
    if (id === chatId) startNew();
  }

  const title = useMemo(() => {
    const first = messages.find((m) => m.role === "user");
    const t = first ? textOf(first) : "";
    return t ? (t.length > 42 ? t.slice(0, 40) + "…" : t) : "New chat";
  }, [messages]);

  const lastReply = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    return last ? textOf(last) : "";
  }, [messages]);

  // ───────────────────────── closed: the Ask button
  if (mode === "closed") {
    return (
      <button
        onClick={() => setMode("open")}
        aria-label="Open agent (⌘J)"
        title="Ask the agent  ⌘J"
        className="fixed right-4 bottom-20 z-40 flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-bg pr-3.5 pl-3 text-[14px] font-medium text-fg shadow-[0_2px_8px_rgba(15,15,15,0.08)] transition-colors hover:bg-soft md:right-6 md:bottom-6"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <AudioLines size={15} strokeWidth={1.8} />}
        {busy ? "Working…" : "Ask"}
      </button>
    );
  }

  // ───────────────────────── minimised: a small box at the bottom
  if (mode === "min") {
    return (
      <div className="card fixed right-4 bottom-20 z-40 w-[300px] overflow-hidden md:right-6 md:bottom-6">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={() => setMode("open")} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label="Expand agent">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hover">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <AudioLines size={14} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{title}</span>
              <span className="block truncate text-[12px] text-muted">
                {busy ? "Working on it…" : serverStatus === "error" ? "Stopped before finishing" : lastReply || "Ready"}
              </span>
            </span>
          </button>
          <button onClick={() => setMode("open")} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label="Expand" title="Expand">
            <ChevronUp size={16} />
          </button>
          <button onClick={() => setMode("closed")} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label="Close" title="Close">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────── open: the full panel
  return (
    <aside
      role="dialog"
      aria-label="Agent"
      className="animate-slide-in fixed inset-0 z-50 flex flex-col bg-bg md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:border-l md:border-line md:shadow-[0_0_0_1px_rgba(15,15,15,0.04),0_8px_32px_rgba(15,15,15,0.12)]"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <AudioLines size={16} className="ml-1" />
        <h2 className="min-w-0 truncate text-[15px] font-semibold">{view === "history" ? "Chat history" : "Agent"}</h2>
        <div className="ml-auto flex items-center gap-0.5">
          <IconBtn label="New chat" onClick={startNew} disabled={streaming}>
            <Plus size={17} />
          </IconBtn>
          <IconBtn label="Chat history" onClick={() => (view === "history" ? setView("chat") : openHistory())} active={view === "history"}>
            <History size={16} />
          </IconBtn>
          <IconBtn label="Minimise" onClick={() => setMode("min")}>
            <Minus size={17} />
          </IconBtn>
          <IconBtn label="Close" onClick={() => setMode("closed")}>
            <X size={17} />
          </IconBtn>
        </div>
      </header>

      {view === "history" ? (
        <div className="flex-1 overflow-y-auto p-2">
          {history === null ? (
            <div className="flex items-center gap-2 p-3 text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : history.length === 0 ? (
            <p className="p-3 text-[13px] text-faint">No saved chats yet.</p>
          ) : (
            history.map((c) => (
              <div key={c.id} className={cn("group flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-hover", c.id === chatId && "bg-active")}>
                <button onClick={() => switchTo(c.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm">{c.title}</span>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">
                    {c.status === "running" && <Loader2 size={11} className="animate-spin" />}
                    {c.status === "running" ? "Working…" : ago(c.updated_at)}
                  </span>
                </button>
                <button
                  onClick={() => removeChat(c.id)}
                  className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                  aria-label={`Delete chat ${c.title}`}
                  title="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="pt-6">
                <p className="text-[15px] font-medium">What should I do?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Type or tap the mic and say it. You can minimise this panel or close the tab — I keep working and save everything here.
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
                      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-hover px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
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
                        if (isToolUIPart(p))
                          return (
                            <ToolRow
                              key={i}
                              name={getToolName(p)}
                              state={p.state}
                              output={p.state === "output-available" ? (p.output as ToolOutput) : undefined}
                              errorText={p.state === "output-error" ? p.errorText : undefined}
                            />
                          );
                        return null;
                      })}
                    </div>
                  ),
                )}
                {busy && (
                  <div className="flex items-center gap-2 text-[13px] text-muted">
                    <Loader2 size={14} className="animate-spin" /> {streaming ? "Working…" : "Still working in the background…"}
                  </div>
                )}
                {!busy && serverStatus === "error" && (
                  <Notice>That run stopped before finishing. What&apos;s above was saved — send your message again to continue.</Notice>
                )}
                {(error || loadError) && <Notice>{loadError ?? "Something went wrong. Your message is saved — try again."}</Notice>}
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
                  placeholder={busy ? "Working on your last message…" : "Tell me what to do…"}
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
                <button
                  type="submit"
                  disabled={!input.trim() || recorder.state !== "idle" || busy}
                  aria-label="Send"
                  className="grid size-8 place-items-center rounded-full bg-accent text-accent-fg transition-opacity disabled:opacity-25"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </aside>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg disabled:opacity-40", active && "bg-active text-fg")}
    >
      {children}
    </button>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md px-3 py-2 text-[13px]" style={{ background: "var(--tag-red-bg)", color: "var(--tag-red-fg)" }}>
      {children}
    </div>
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
