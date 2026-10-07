import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon, KeyRoundIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { signOut } from "@/actions/auth";
import { ThemePicker } from "@/components/theme-picker";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/page-header";
import { SettingsIcon, UsersIcon } from "@/components/icons";
import { getCurrentProfile } from "@/lib/data";
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
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader icon={<SettingsIcon className="size-6.5" />} title="Settings" description="Profile, appearance, backup and account." />

      {profile?.role === "super_admin" && (
        <Link
          href="/admin/users"
          className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-card p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <UsersIcon className="size-5.5" />
          </span>
          <span className="flex-1">
            <span className="block font-medium">Manage users</span>
            <span className="block text-sm text-muted-foreground">See every user&apos;s totals and add new accounts.</span>
          </span>
          <ShieldCheckIcon className="size-5 text-primary" aria-hidden="true" />
        </Link>
      )}

      <Section title="Profile">
        <ProfileForm displayName={profile?.display_name ?? ""} />
        <Link href="/reset-password" className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-9")}>
          <KeyRoundIcon /> Change password
        </Link>
      </Section>

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
            <dd className="truncate">{profile?.email ?? String(claims?.email ?? "")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="inline-flex items-center gap-1">
              {profile?.role === "super_admin" ? (
                <>
                  <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" /> Super admin
                </>
              ) : (
                "User"
              )}
            </dd>
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
