/**
 * Background cron job — runs every hour and removes sessions older than 24 h.
 * Import this module once at app startup (e.g. in next.config.ts or a custom server).
 */

import cron from "node-cron";
import { cleanupExpiredSessions } from "./cleanup";

let started = false;

export function startCleanupCron(): void {
  if (started) return;
  started = true;

  // Run once immediately on startup
  cleanupExpiredSessions();

  // Then every hour
  cron.schedule("0 * * * *", () => {
    cleanupExpiredSessions();
  });
}
