"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white text-danger">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-5 font-serif text-3xl tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          That request didn&apos;t complete. Try again — nothing you published was lost.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
