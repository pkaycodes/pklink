"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";
import { deleteCreationAction, setPublishedAction } from "@/app/actions";
import { Button } from "./ui";
import { cn } from "@/lib/utils";

export function DeleteCreationButton({
  id,
  title,
  redirectTo = "/dashboard",
  label = "Delete",
}: {
  id: string;
  title: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete “${title}”? The page and its QR code stop working immediately. This can't be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCreationAction(id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete this page.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        {label}
      </Button>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  );
}

export function PublishToggle({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(published);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setPublishedAction(id, next);
      if (!result.ok) {
        setEnabled(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
          : "border-line bg-white text-muted hover:border-line-strong",
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Power className="h-3.5 w-3.5" />
      )}
      {enabled ? "Live — tap to disable" : "Disabled — tap to enable"}
    </button>
  );
}
