import { anyApi } from "convex/server";

const env = import.meta.env as unknown as { VITE_CONVEX_URL?: string };

// The app passes URL params through Convex calls as plain strings today.
// Keep the loose API facade until those boundaries use branded Convex Id types.
export const api = anyApi;

export const convexUrl =
  env.VITE_CONVEX_URL ?? "https://keen-marmot-770.convex.cloud";
