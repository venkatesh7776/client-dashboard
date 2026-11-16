"use client";

import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createProjectUpload, deleteProjectFile, getProjectFileUrl, registerProjectFile } from "@/app/actions";
import { Button, Empty } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/format";
import type { ProjectFile } from "@/lib/types";

const MAX = 50 * 1024 * 1024;

function size(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectFiles({ projectId, files }: { projectId: string; files: ProjectFile[] }) {
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(list: FileList | File[]) {
    setError(null);
    const all = Array.from(list);
    const tooBig = all.filter((f) => f.size > MAX);
    if (tooBig.length) setError(`${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over 50 MB.`);
    const ok = all.filter((f) => f.size <= MAX);
    setUploading((u) => [...u, ...ok.map((f) => f.name)]);
    for (const f of ok) {
      try {
        const s = await createProjectUpload(projectId, f.name);
        if (!s.ok || !s.url || !s.path) throw new Error(s.error ?? "Could not start upload");
        const res = await fetch(s.url, {
          method: "PUT",
          headers: { "content-type": f.type || "application/octet-stream", "x-upsert": "false" },
          body: f,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        const r = await registerProjectFile(projectId, { path: s.path, name: f.name, size: f.size, mime: f.type });
        if (!r.ok) throw new Error(r.error ?? "Could not save file");
      } catch (e) {
        setError(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      } finally {
        setUploading((u) => {
          const i = u.indexOf(f.name);
          return i < 0 ? u : [...u.slice(0, i), ...u.slice(i + 1)];
        });
      }
    }
    router.refresh();
  }

  function open(id: string) {
    setBusyId(id);
    start(async () => {
      const r = await getProjectFileUrl(id);
      setBusyId(null);
      if (r.ok && r.url) window.location.assign(r.url); // signed URL is sent as a download, so the page stays
      else setError(r.error ?? "Could not open file");
    });
  }

  function remove(id: string) {
    setBusyId(id);
    start(async () => {
      const r = await deleteProjectFile(id);
      setBusyId(null);
      setConfirmId(null);
      if (!r.ok) setError(r.error ?? "Could not delete file");
    });
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
      className={cn("transition-colors", dragOver && "bg-active")}
    >
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />
      {files.length === 0 && uploading.length === 0 ? (
        <Empty
          message="No documents yet. Drop files here or upload."
          action={
            <Button size="sm" onClick={() => input.current?.click()}>
              <Upload size={14} /> Upload
            </Button>
          }
        />
      ) : (
        <ul className="p-1.5">
          {uploading.map((n, i) => (
            <li key={`u-${i}`} className="flex h-10 items-center gap-2.5 px-2.5 text-sm text-muted">
              <Loader2 size={15} className="animate-spin" /> <span className="truncate">{n}</span>
            </li>
          ))}
          {files.map((f) => (
            <li key={f.id} className="group flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-1 hover:bg-hover">
              <FileText size={15} className="shrink-0 text-muted" />
              <button onClick={() => open(f.id)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline" title="Open">
                {f.name}
              </button>
              <span className="hidden text-[12px] text-faint sm:inline">
                {size(f.size)} · {fmtDate(f.created_at.slice(0, 10))}
              </span>
              {busyId === f.id ? (
                <Loader2 size={15} className="animate-spin text-muted" />
              ) : confirmId === f.id ? (
                <span className="flex items-center gap-1">
                  <Button variant="danger" size="sm" onClick={() => remove(f.id)}>
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                    Keep
                  </Button>
                </span>
              ) : (
                <span className="flex items-center">
                  <button onClick={() => open(f.id)} className="rounded-md p-1.5 text-faint hover:bg-hover hover:text-fg" aria-label={`Download ${f.name}`}>
                    <Download size={15} />
                  </button>
                  <button onClick={() => setConfirmId(f.id)} className="rounded-md p-1.5 text-faint hover:bg-hover hover:text-danger" aria-label={`Delete ${f.name}`}>
                    <Trash2 size={15} />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="px-4 pb-3 text-[13px] text-danger">{error}</p>}
      {(files.length > 0 || uploading.length > 0) && (
        <div className="border-t border-line px-4 py-2.5">
          <Button size="sm" variant="ghost" onClick={() => input.current?.click()}>
            <Upload size={14} /> Upload files
          </Button>
          <span className="ml-2 text-[12px] text-faint">or drop them here · up to 50 MB each</span>
        </div>
      )}
    </div>
  );
}
