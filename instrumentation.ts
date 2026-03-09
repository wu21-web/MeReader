/**
 * Next.js instrumentation hook — runs once when the server starts.
 * We use it to kick off the 24-hour file cleanup cron job.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCleanupCron } = await import("./lib/cronCleanup");
    startCleanupCron();
  }
}
