import { createRequire } from "node:module";
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);

// Starts downloading Clerk's script from the HTML, in parallel with the app
// bundle, instead of only once the bundle has run and ClerkProvider injects
// it. The URL and crossorigin mode must match what @clerk/clerk-react
// requests or the browser downloads the script twice, so the URL comes from
// the same @clerk/shared function Clerk itself uses.
const earlyConnections = (env: Record<string, string>): Plugin => ({
  name: "early-connections",
  transformIndexHtml() {
    const tags: HtmlTagDescriptor[] = [];
    if (env.VITE_CLERK_PUBLISHABLE_KEY) {
      const { clerkJsScriptUrl } = require("@clerk/shared/loadClerkJsScript") as {
        clerkJsScriptUrl: (opts: { publishableKey: string }) => string;
      };
      tags.push({
        tag: "link",
        attrs: {
          rel: "preload",
          as: "script",
          crossorigin: "anonymous",
          href: clerkJsScriptUrl({ publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY }),
        },
        injectTo: "head",
      });
    }
    if (env.VITE_CONVEX_URL) {
      tags.push({
        tag: "link",
        attrs: { rel: "dns-prefetch", href: new URL(env.VITE_CONVEX_URL).origin },
        injectTo: "head",
      });
    }
    return tags;
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  plugins: [react(), earlyConnections(loadEnv(mode, process.cwd(), "VITE_"))],
  server: {
    allowedHosts: ["butaud-hp-spectre-silver.tail8f308b.ts.net"],
  },
}));
