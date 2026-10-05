"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDisplayName } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safe } from "@/lib/safe";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [name, setName] = useState(displayName);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await safe(updateDisplayName(name));
          if (result.ok) toast.success("Name saved");
          else toast.error(result.error);
        });
      }}
    >
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="display-name">Your name</Label>
        <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="How should we call you?" className="h-9" />
      </div>
      <Button type="submit" variant="outline" className="h-9" disabled={pending || name.trim() === displayName}>
        Save
      </Button>
    </form>
  );
}
