import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8 text-lg" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
