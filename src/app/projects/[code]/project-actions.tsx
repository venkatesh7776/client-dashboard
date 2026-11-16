"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProjectSheet } from "@/components/panels";
import { Button } from "@/components/ui";
import type { Option, Project } from "@/lib/types";

export function ProjectActions({ project, clientOptions }: { project: Project; clientOptions: Option[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Pencil size={14} /> Edit
      </Button>
      <ProjectSheet
        open={open}
        onClose={() => setOpen(false)}
        project={project}
        clientOptions={clientOptions}
        onDeleted={() => router.push("/projects")}
      />
    </>
  );
}
