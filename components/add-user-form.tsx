"use client";

import { useState, useTransition } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/task-fields";
import { safe } from "@/lib/safe";

export function AddUserForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="rounded-2xl border bg-card p-4 md:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const email = String(data.get("email") ?? "");
        startTransition(async () => {
          const result = await safe(
            createUser({
              email,
              displayName: String(data.get("displayName") ?? ""),
              password: String(data.get("password") ?? ""),
            }),
          );
          if (result.ok) {
            form.reset();
            setErrors({});
            toast.success(`Added ${email}. Share the temporary password with them privately.`);
          } else {
            setErrors(result.fieldErrors ?? {});
            toast.error(result.error);
          }
        });
      }}
    >
      <h2 className="font-medium">Add a user</h2>
      <p className="mt-0.5 mb-4 text-sm text-muted-foreground">
        They sign in with this temporary password and can change it in Settings.
      </p>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-start">
        <div className="grid gap-1.5">
          <Label htmlFor="new-user-email">Email</Label>
          <Input id="new-user-email" name="email" type="email" autoComplete="off" required className="h-9" aria-invalid={Boolean(errors.email)} />
          <FieldError message={errors.email} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-user-name">Name (optional)</Label>
          <Input id="new-user-name" name="displayName" autoComplete="off" maxLength={80} className="h-9" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-user-password">Temporary password</Label>
          <Input
            id="new-user-password"
            name="password"
            type="text"
            autoComplete="new-password"
            minLength={8}
            required
            className="h-9"
            aria-invalid={Boolean(errors.password)}
          />
          <FieldError message={errors.password} />
        </div>
        <Button type="submit" className="h-9 md:mt-[1.375rem]" disabled={pending}>
          <UserPlusIcon /> {pending ? "Adding…" : "Add user"}
        </Button>
      </div>
    </form>
  );
}
