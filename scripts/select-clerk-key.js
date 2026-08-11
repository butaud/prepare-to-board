// Cloudflare Workers Builds runs one build for every branch, using a single
// flat pool of "Build variables" (no separate preview/production values,
// unlike Cloudflare Pages). Production Clerk keys are domain-locked, so a PR
// preview deploy (a throwaway *.workers.dev subdomain) can never use the
// same key as the real production domain.
//
// Workers Builds does inject WORKERS_CI_BRANCH into the build environment,
// so this script picks the right key based on branch and writes it to
// .env.local (gitignored) before `vite build` runs, where Vite will pick it
// up automatically. It only acts when both *_PROD and *_PREVIEW variables
// are present (i.e. only inside a Workers Builds run) - a plain local `yarn
// build` is unaffected and keeps using whatever VITE_CLERK_PUBLISHABLE_KEY
// is already in .env/.env.local.

import { appendFileSync, existsSync, readFileSync } from "node:fs";

const PRODUCTION_BRANCH = "master";

const prodKey = process.env.VITE_CLERK_PUBLISHABLE_KEY_PROD;
const previewKey = process.env.VITE_CLERK_PUBLISHABLE_KEY_PREVIEW;

if (!prodKey || !previewKey) {
  console.log(
    "[select-clerk-key] VITE_CLERK_PUBLISHABLE_KEY_PROD/_PREVIEW not both set, skipping (not a Workers Builds run)."
  );
  process.exit(0);
}

const branch = process.env.WORKERS_CI_BRANCH;
const isProduction = branch === PRODUCTION_BRANCH;
const selectedKey = isProduction ? prodKey : previewKey;

console.log(
  `[select-clerk-key] branch="${branch ?? "(unset)"}" -> using ${
    isProduction ? "PROD" : "PREVIEW"
  } Clerk key.`
);

const envLocalPath = ".env.local";
const existing = existsSync(envLocalPath)
  ? readFileSync(envLocalPath, "utf8")
  : "";
if (existing.includes("VITE_CLERK_PUBLISHABLE_KEY=")) {
  throw new Error(
    `[select-clerk-key] ${envLocalPath} already defines VITE_CLERK_PUBLISHABLE_KEY - refusing to append a conflicting value.`
  );
}

appendFileSync(envLocalPath, `\nVITE_CLERK_PUBLISHABLE_KEY=${selectedKey}\n`);
