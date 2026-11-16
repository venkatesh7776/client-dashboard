"use client";

import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">{error.message}</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
