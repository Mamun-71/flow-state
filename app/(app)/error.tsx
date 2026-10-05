"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <p className="font-medium">Something went wrong loading this page.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {error.message === "Not signed in" ? "Your session may have ended." : "Check your connection and try again."}
      </p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
