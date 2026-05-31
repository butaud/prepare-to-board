import { anyApi } from "convex/server";

export const api = anyApi;

export const convexUrl =
  import.meta.env.VITE_CONVEX_URL ?? "https://keen-marmot-770.convex.cloud";
