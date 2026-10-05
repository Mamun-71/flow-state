import type { Metadata } from "next";
import { DownloadIcon, LogOutIcon } from "lucide-react";
import { signOut } from "@/actions/auth";
import { ThemePicker } from "@/components/theme-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { SESSION_MAX_AGE_DAYS, sessionDaysLeft } from "@/lib/auth-config";
import { TZ } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const daysLeft = sessionDaysLeft(claims);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>

      <Section title="Appearance" description="Follows your system setting unless you pick one.">
        <ThemePicker />
      </Section>

      <Section title="Backup" description="Download all your categories, tasks and time sessions.">
        <div className="flex flex-wrap gap-2">
          <a href="/api/export?format=json" className={cn(buttonVariants({ variant: "outline" }), "h-9")} download>
            <DownloadIcon /> Full backup (JSON)
          </a>
          <a href="/api/export?format=csv&table=tasks" className={cn(buttonVariants({ variant: "outline" }), "h-9")} download>
            <DownloadIcon /> Tasks (CSV)
          </a>
          <a href="/api/export?format=csv&table=sessions" className={cn(buttonVariants({ variant: "outline" }), "h-9")} download>
            <DownloadIcon /> Time sessions (CSV)
          </a>
        </div>
      </Section>

      <Section title="Account">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Signed in as</dt>
            <dd className="truncate">{String(claims?.email ?? "")}</dd>
          </div>
          {daysLeft !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Session on this device</dt>
              <dd>
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left of {SESSION_MAX_AGE_DAYS}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Time zone</dt>
            <dd>{TZ}</dd>
          </div>
        </dl>
        <form action={signOut} className="mt-4">
          <Button type="submit" variant="outline" className="h-9">
            <LogOutIcon /> Sign out
          </Button>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 md:p-5">
      <h2 className="font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
