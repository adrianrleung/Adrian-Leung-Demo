import { redirect } from "next/navigation";
import { APPS } from "@/platform/registry";

/**
 * No platform console: apps mount at their own routes and Git is the registry.
 * The root simply forwards to the first configured app.
 */
export default function Home() {
  redirect(`/${APPS[0].slug}`);
}
