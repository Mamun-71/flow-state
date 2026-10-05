import type { ActionResult } from "@/lib/action-result";

/**
 * Awaits a Server Action without letting a thrown error (offline, expired session)
 * reach an error boundary from inside a transition; it becomes a normal failure instead.
 */
export async function safe<T>(promise: Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await promise;
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
}
