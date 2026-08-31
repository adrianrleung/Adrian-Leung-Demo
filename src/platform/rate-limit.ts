import { HttpError } from "./server";

interface Window {
  start: number;
  count: number;
}

const windows = new Map<string, Window>();

const LIMIT = 30;
const WINDOW_MS = 60_000;

/**
 * Fixed-window per-user limit on mutating requests, so a stolen session or
 * runaway script cannot mass-fire actions. In-memory: sufficient for a
 * single-replica internal tool; swap for Redis if replicas ever matter.
 */
export function checkRateLimit(
  userId: string,
  limit: number = LIMIT,
  windowMs: number = WINDOW_MS,
  now: number = Date.now(),
): void {
  const window = windows.get(userId);
  if (!window || now - window.start >= windowMs) {
    windows.set(userId, { start: now, count: 1 });
    return;
  }
  window.count += 1;
  if (window.count > limit) {
    throw new HttpError(429, "Too many requests; slow down");
  }
}

export function resetRateLimits(): void {
  windows.clear();
}
