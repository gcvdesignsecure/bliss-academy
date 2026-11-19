// Reads the { error } message out of a failed Edge Function call.
export async function fnError(err: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (err as { context?: Response }).context;
    if (!ctx) return fallback;
    const j = (await ctx.json()) as { error?: string };
    return j.error ?? fallback;
  } catch {
    return fallback;
  }
}