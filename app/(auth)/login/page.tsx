import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired, reset } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Sign in to plan and track your day.</p>
      {expired === "1" && (
        <p role="status" className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm">
          Your session ended after 15 days. Please sign in again.
        </p>
      )}
      {reset === "failed" && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          That reset link is invalid or has expired. Request a new one.
        </p>
      )}
      <LoginForm />
    </>
  );
}
