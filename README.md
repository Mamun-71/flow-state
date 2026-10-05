# FlowState

A private web app to plan daily tasks with time estimates, track actual time with a play/pause timer, and see productive hours over time.

Next.js 16 (App Router) · Tailwind CSS 4 · shadcn/ui (Base UI) · Supabase (Postgres + Auth) · Recharts · dnd-kit · Motion.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. **Authentication → Users → Add user**: create your own account (email + password, tick "Auto confirm").
4. **Authentication → Sign In / Providers**: turn off **Allow new users to sign up**.
5. **Project Settings → API**: copy the project URL and the **publishable** (anon) key.

### 2. Local app

```bash
cp .env.example .env.local   # then fill in the two Supabase values
npm install
npm run dev
```

Open http://localhost:3000 and sign in.

> Never put the Supabase service-role (secret) key in this project. Row Level Security keeps every row private to its owner.

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
