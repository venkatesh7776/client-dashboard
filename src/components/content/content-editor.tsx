"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type ComponentProps } from "react";
import { deleteContent, updateContent } from "@/app/actions";
import { Properties } from "@/components/property-list";
import { notify } from "@/components/toast";
import { Button, Input, Select } from "@/components/ui";
import { CONTENT_PLATFORMS, CONTENT_STATUSES } from "@/lib/constants";
import { cn, reelLength } from "@/lib/format";
import { contentPatchSchema, parseForm, type FieldErrors } from "@/lib/schemas";
import type { Content } from "@/lib/types";

type Fields = Pick<Content, "title" | "status" | "platform" | "pillar" | "script" | "notes" | "caption" | "planned_date">;
type Key = keyof Fields;
type SaveState = "saved" | "unsaved" | "saving" | "error";

/** Textarea that grows with its text, so a long script reads like a page, not a box. */
function AutoTextarea({ className, value, ...props }: ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} value={value} rows={1} className={cn("w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-faint", className)} {...props} />;
}

export function ContentEditor({ item, pillars }: { item: Content; pillars: string[] }) {
  const router = useRouter();
  const [vals, setVals] = useState<Fields>({
    title: item.title,
    status: item.status,
    platform: item.platform,
    pillar: item.pillar,
    script: item.script,
    notes: item.notes,
    caption: item.caption,
    planned_date: item.planned_date,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SaveState>("saved");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const dirty = useRef<Partial<Fields>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = dirty.current;
    if (!Object.keys(patch).length || inFlight.current) return;
    dirty.current = {};
    inFlight.current = true;
    setState("saving");
    try {
      // Status changes refresh the page so the board stays right.
      const r = await updateContent(item.id, patch, { revalidate: "status" in patch });
      if (r.ok) setState(Object.keys(dirty.current).length ? "unsaved" : "saved");
      else {
        dirty.current = { ...patch, ...dirty.current };
        setErrors((e) => ({ ...e, ...(r.errors ?? {}) }));
        setState("error");
      }
    } catch {
      dirty.current = { ...patch, ...dirty.current };
      setState("error");
    } finally {
      inFlight.current = false;
      if (Object.keys(dirty.current).length && !timer.current) timer.current = setTimeout(flush, 1500);
    }
  }, [item.id]);

  function change<K extends Key>(key: K, value: Fields[K], immediate = false) {
    setVals((v) => ({ ...v, [key]: value }));
    // Check just this field; an invalid value stays on screen but isn't sent.
    const check = parseForm(contentPatchSchema, { [key]: value ?? "" });
    if (!check.ok) {
      setErrors((e) => ({ ...e, [key]: check.errors[key] }));
      delete dirty.current[key];
      return;
    }
    setErrors((e) => ({ ...e, [key]: undefined }));
    dirty.current = { ...dirty.current, [key]: value ?? "" };
    setState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    if (immediate) void flush();
    else timer.current = setTimeout(flush, 800);
  }

  // Never lose typing: save on leave, warn if the tab closes mid-save.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirty.current).length || inFlight.current) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (timer.current) clearTimeout(timer.current);
      const patch = dirty.current;
      if (Object.keys(patch).length) void updateContent(item.id, patch);
    };
  }, [flush, item.id]);

  const len = reelLength(vals.script);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(vals.caption ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Couldn't copy — select the text and copy it instead.");
    }
  }

  function remove() {
    startDelete(async () => {
      dirty.current = {};
      const r = await deleteContent(item.id);
      if (r.ok) {
        notify("Deleted.");
        router.push("/content");
      } else notify(r.error ?? "Couldn't delete");
    });
  }

  const label: Record<SaveState, string> = { saved: "Saved", unsaved: "Editing…", saving: "Saving…", error: "Couldn't save — retrying" };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="tabular flex items-center gap-2 text-[13px] text-muted">
            {item.content_code}
            <span aria-live="polite" className={cn("flex items-center gap-1 text-[12.5px]", state === "error" ? "text-danger" : "text-faint")}>
              · {state === "saved" && <Check size={12} />}
              {label[state]}
            </span>
          </div>
          <AutoTextarea
            value={vals.title}
            onChange={(e) => change("title", e.target.value.replace(/\n/g, " "))}
            onBlur={() => void flush()}
            maxLength={200}
            placeholder="Title or hook"
            aria-label="Title or hook"
            className="mt-1 text-[28px] leading-tight font-bold tracking-[-0.02em] sm:text-[34px]"
          />
          {errors.title && <p className="text-[12.5px] text-danger">{errors.title}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section className="card">
            <div className="flex h-12 items-center justify-between border-b border-line px-5">
              <h2 className="text-[15px] font-semibold">Script</h2>
              <span className="tabular text-[13px] text-muted">{len ? `${len.words} words · ${len.label}` : "Spoken length shows here"}</span>
            </div>
            <AutoTextarea
              value={vals.script ?? ""}
              onChange={(e) => change("script", e.target.value)}
              onBlur={() => void flush()}
              placeholder={"Hook — the first 3 seconds\n\nBody — the point, one idea\n\nCall to action — follow, save, comment"}
              aria-label="Script"
              className="min-h-64 px-5 py-4 text-[15px] leading-[1.7]"
            />
          </section>

          <section className="card">
            <div className="flex h-12 items-center justify-between border-b border-line px-5">
              <h2 className="text-[15px] font-semibold">Caption &amp; hashtags</h2>
              <Button size="sm" variant="ghost" onClick={copyCaption} disabled={!vals.caption}>
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </Button>
            </div>
            <AutoTextarea
              value={vals.caption ?? ""}
              onChange={(e) => change("caption", e.target.value)}
              onBlur={() => void flush()}
              placeholder="Caption for the post, then #hashtags"
              aria-label="Caption and hashtags"
              className="min-h-24 px-5 py-4 text-[14px] leading-relaxed"
            />
            {errors.caption && <p className="px-5 pb-3 text-[12.5px] text-danger">{errors.caption}</p>}
          </section>

          <section className="card">
            <div className="flex h-12 items-center border-b border-line px-5">
              <h2 className="text-[15px] font-semibold">Idea notes</h2>
            </div>
            <AutoTextarea
              value={vals.notes ?? ""}
              onChange={(e) => change("notes", e.target.value)}
              onBlur={() => void flush()}
              placeholder="Why this idea, references, links, shot list…"
              aria-label="Idea notes"
              className="min-h-24 px-5 py-4 text-[14px] leading-relaxed"
            />
          </section>
        </div>

        <div className="order-first h-fit space-y-4 lg:sticky lg:top-6 lg:order-none">
          <div className="card px-5 py-4">
            <Properties
              rows={[
                [
                  "Status",
                  <Select key="s" aria-label="Status" value={vals.status} onChange={(e) => change("status", e.target.value, true)}>
                    {CONTENT_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>,
                ],
                [
                  "Platform",
                  <Select key="p" aria-label="Platform" value={vals.platform} onChange={(e) => change("platform", e.target.value, true)}>
                    {CONTENT_PLATFORMS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>,
                ],
                [
                  "Pillar",
                  <div key="pi" className="w-full">
                    <Input
                      aria-label="Pillar"
                      list="content-pillars"
                      value={vals.pillar ?? ""}
                      maxLength={60}
                      placeholder="e.g. Tips"
                      onChange={(e) => change("pillar", e.target.value)}
                      onBlur={() => void flush()}
                    />
                    <datalist id="content-pillars">
                      {pillars.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>,
                ],
                [
                  "Post on",
                  <Input key="d" type="date" aria-label="Planned post date" value={vals.planned_date ?? ""} onChange={(e) => change("planned_date", e.target.value || null, true)} />,
                ],
              ]}
            />
          </div>

          <div className="flex justify-end">
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <Button variant="danger" size="sm" onClick={remove} disabled={deleting}>
                  {deleting ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
