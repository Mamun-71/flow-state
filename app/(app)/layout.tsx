import { AppHeader, BottomNav } from "@/components/app-nav";
import { TimerBar } from "@/components/timer-bar";
import { TimerProvider } from "@/components/timer-provider";
import { getCurrentProfile, getTimerState } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ running, serverNow }, profile] = await Promise.all([getTimerState(), getCurrentProfile()]);
  const isAdmin = profile?.role === "super_admin";
  const name = profile?.display_name || profile?.email || "";

  return (
    <TimerProvider running={running} serverNow={serverNow}>
      <AppHeader isAdmin={isAdmin} name={name} />
      <TimerBar />
      <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-44 md:px-6 md:pt-8 md:pb-16">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </TimerProvider>
  );
}
