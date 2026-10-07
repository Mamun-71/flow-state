# FlowState

A private web app to plan daily tasks with time estimates, track actual time with a play/pause timer, and see productive hours over time.

Next.js 16 (App Router) · Tailwind CSS 4 · shadcn/ui (Base UI) · Supabase (Postgres + Auth) · Recharts · dnd-kit · Motion.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it.
   Then do the same, in order, with [`supabase/002_users_and_admin.sql`](supabase/002_users_and_admin.sql) (user profiles and the super admin role) and [`supabase/003_editable_actual_time.sql`](supabase/003_editable_actual_time.sql) (editing a task's Actual time).
3. **Authentication → Users → Add user**: create the super admin account `dev.almamunsalauddin@gmail.com` (tick "Auto confirm"). It gets the `super_admin` role automatically; every other account is a normal `user`.
4. **Authentication → Sign In / Providers**: turn off **Allow new users to sign up**. From now on the super admin adds users on the in-app **Users** page.
5. **Project Settings → API Keys**: copy the project URL, the **publishable** key, and the **secret** key (server-only, for creating users).

### Users and roles

- Every user's categories, tasks and time are private to them (Row Level Security).
- The super admin sees a **Users** page with each user's totals (tasks, hours) — not their tasks — and can add users with a temporary password. Users change their password and name in **Settings**.
- To make another email a super admin, edit `default_role_for` in `002_users_and_admin.sql`, or run `update public.profiles set role = 'super_admin' where email = '…';` in the SQL editor.

### 2. Local app

```bash
cp .env.example .env.local   # then fill in the two Supabase values
npm install
npm run dev
```

Open http://localhost:3005 and sign in (the dev server always uses port 3005).

> The secret key (`SUPABASE_SECRET_KEY`) is used only on the server, only for creating users, and only after checking the caller is the super admin. Never give it a `NEXT_PUBLIC_` prefix and never commit it.

### 3. Deploy (Vercel Hobby)

1. Push to GitHub (`.env.local` is git-ignored).
2. Import the repo in Vercel and add the env vars from `.env.example`.
3. In Supabase → **Authentication → URL Configuration**, set the Site URL to your Vercel URL and add `https://<your-app>.vercel.app/auth/callback` to the redirect URLs (needed for password reset emails).

## How it works

- **Timer = time sessions.** Play inserts a session with the database clock (`now()`); Pause fills in its end. Actual time is the sum of sessions, so the timer survives refreshes, sleep and device switches. Only one timer can run (a unique index enforces it); pressing Play on another task pauses the current one.
- **Atomic actions.** `start_timer`, `pause_timer`, `complete_task`, `stop_timer_at` and `reorder_tasks` are Postgres functions called via `supabase.rpc`, run as the signed-in user so RLS still applies.
- **15-day sessions.** `proxy.ts` reads the real sign-in time from the JWT `amr` claim and signs out 15 days later (Supabase's own session limits are a paid feature). Auth cookies are also capped at 15 days. Change `SESSION_MAX_AGE_DAYS` in `lib/auth-config.ts`.
- **Time zone.** "Today" and per-day statistics use `APP_TIMEZONE` (default `Asia/Dhaka`), not the server clock. Sessions crossing midnight are split between both days.

## Keyboard shortcuts (desktop)

| Key | Action |
|---|---|
| `N` | New task (focus quick add) |
| `Space` | Play / pause the selected task |
| `D` | Mark the selected task as done |
| `Enter` | Open the selected task |

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

To test the 15-day limit, temporarily set `SESSION_MAX_AGE_DAYS` to `0.002` (about 3 minutes), sign in, wait, reload, and confirm the redirect to `/login?expired=1`.
