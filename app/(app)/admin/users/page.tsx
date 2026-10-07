import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { ShieldCheckIcon } from "lucide-react";
import { AddUserForm } from "@/components/add-user-form";
import { PageHeader } from "@/components/page-header";
import { UsersIcon } from "@/components/icons";
import { getAdminUsers, getCurrentProfile } from "@/lib/data";
import { formatDate, dayOf } from "@/lib/dates";
import { formatMinutesLong } from "@/lib/time";
import type { AdminUserRow } from "@/lib/database.types";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "super_admin") notFound();

  const users = await getAdminUsers();
  const totalHours = users.reduce((s, u) => s + u.tracked_seconds_30d, 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<UsersIcon className="size-6.5" />}
        eyebrow="Super admin"
        title="Users"
        description={
          <>
            {users.length} {users.length === 1 ? "user" : "users"} · {formatMinutesLong(totalHours / 60)} tracked in the last 30 days.
            Each user&apos;s tasks stay private; you see totals only.
          </>
        }
      />

      <AddUserForm />

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 text-right font-medium">Tasks</th>
              <th className="px-4 py-3 text-right font-medium">Last 30 days</th>
              <th className="px-4 py-3 text-right font-medium">All time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <UserName user={u} isYou={u.id === profile.id} />
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(dayOf(u.created_at))}</td>
                <td className="px-4 py-3 text-muted-foreground">{ago(u.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {u.done_count}
                  <span className="text-muted-foreground"> / {u.task_count}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMinutesLong(u.tracked_seconds_30d / 60)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{formatMinutesLong(u.tracked_seconds / 60)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="grid gap-3 md:hidden">
        {users.map((u) => (
          <li key={u.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <UserName user={u} isYou={u.id === profile.id} />
              <RoleBadge role={u.role} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Stat label="30 days" value={formatMinutesLong(u.tracked_seconds_30d / 60)} />
              <Stat label="Tasks done" value={`${u.done_count} / ${u.task_count}`} />
              <Stat label="Last sign-in" value={ago(u.last_sign_in_at)} />
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ago(iso: string | null) {
  return iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "Never";
}

function UserName({ user, isYou }: { user: AdminUserRow; isYou: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">
        {user.display_name || user.email.split("@")[0]}
        {isYou && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
      </p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminUserRow["role"] }) {
  return role === "super_admin" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <ShieldCheckIcon className="size-3.5" aria-hidden="true" /> Super admin
    </span>
  ) : (
    <span className="inline-flex shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">User</span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
