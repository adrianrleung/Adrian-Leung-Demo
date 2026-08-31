import refunds from "@/apps/refunds.app";
import type { AppConfig } from "./types";

/**
 * Apps are plain modules. Adding a tool means adding one file and one line
 * below (`npm run new-app -- <slug>` does both) — there is no management
 * console, because Git already is one.
 */
const ALL: readonly AppConfig[] = [
  refunds,
];

export const APPS: readonly AppConfig[] = ALL;

export function getApp(slug: string): AppConfig | undefined {
  return APPS.find((app) => app.slug === slug);
}
