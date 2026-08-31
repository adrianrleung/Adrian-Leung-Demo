import refunds from "@/apps/refunds.app";
import type { AppConfig } from "./types";

/**
 * Apps are plain modules. Adding a tool means adding one file here and one
 * line below — there is no management console, because Git already is one.
 */
export const APPS: readonly AppConfig[] = [refunds];

export function getApp(slug: string): AppConfig | undefined {
  return APPS.find((app) => app.slug === slug);
}
