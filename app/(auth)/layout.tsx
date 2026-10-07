import { Logo } from "@/components/logo";
import { ActualIcon, CalendarIcon, StatsIcon } from "@/components/icons";

const POINTS = [
  { icon: ActualIcon, title: "Plan, then press play", text: "Estimate each task and track the real time with one tap." },
  { icon: CalendarIcon, title: "See every day at a glance", text: "A calendar of the hours you actually worked." },
  { icon: StatsIcon, title: "Learn your rhythm", text: "Trends, categories, and how good your estimates are." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop) */}
      <section className="relative hidden overflow-hidden bg-[oklch(0.24_0.08_277)] p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-[oklch(0.55_0.2_277)] opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[26rem] rounded-full bg-[oklch(0.6_0.18_320)] opacity-35 blur-3xl" />
        <svg className="pointer-events-none absolute inset-x-0 bottom-24 w-full opacity-25" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 80 C100 20 200 20 300 70 S500 120 600 50" fill="none" stroke="white" strokeWidth="2" />
          <path d="M0 100 C120 50 220 60 320 90 S520 110 600 80" fill="none" stroke="white" strokeWidth="1.2" />
        </svg>
        <Logo className="relative text-lg [&_rect]:fill-white [&_path]:stroke-[oklch(0.3_0.1_277)] [&_circle]:fill-[oklch(0.3_0.1_277)]" />
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">Calm focus, measured honestly.</h2>
          <p className="mt-3 text-white/70">Your private space to plan the day, track focused time, and see where the hours go.</p>
          <ul className="mt-10 grid gap-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form */}
      <section className="flex flex-col items-center justify-center px-4 py-12">
        <Logo className="mb-8 text-lg lg:hidden" />
        <div className="w-full max-w-sm rounded-3xl border bg-card/90 p-6 shadow-xl shadow-primary/5 backdrop-blur sm:p-8">{children}</div>
        <p className="mt-6 text-xs text-muted-foreground">Private workspace · accounts are created by the admin</p>
      </section>
    </main>
  );
}
