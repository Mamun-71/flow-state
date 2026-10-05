"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">We&apos;ll email you a link to set a new one.</p>
      {state?.message ? (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : (
        <form action={action} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required className="h-10" />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-10" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <Link href="/login" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
        Back to sign in
      </Link>
    </>
  );
}
