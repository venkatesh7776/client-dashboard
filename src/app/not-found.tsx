import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted">This page doesn&apos;t exist, or the record was deleted.</p>
      <LinkButton href="/" className="mt-6">Go home</LinkButton>
    </div>
  );
}
