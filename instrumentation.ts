export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCleanupCron } = await import("./lib/cronCleanup");
    startCleanupCron();
  }
}
