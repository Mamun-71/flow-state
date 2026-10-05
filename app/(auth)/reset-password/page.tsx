"use client";

import { useActionState } from "react";
import { updatePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Use at least 8 characters.</p>
      <form action={action} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-10" />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
      </form>
    </>
  );
}
