import cron from "node-cron";
import { cleanupExpiredSessions } from "./cleanup";

let started = false;

export function startCleanupCron(): void {
  if (started) return;
  started = true;

  cleanupExpiredSessions();

  cron.schedule("0 * * * *", () => {
    cleanupExpiredSessions();
  });
}
