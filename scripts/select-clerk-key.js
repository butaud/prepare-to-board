// Cloudflare Workers Builds runs one build for every branch, using a single
// flat pool of "Build variables" (no separate preview/production values,
// unlike Cloudflare Pages). Production Clerk keys are domain-locked, so a PR
// preview deploy (a throwaway *.workers.dev subdomain) can never use the
// same key as the real production domain.
//
// Workers Builds does inject WORKERS_CI_BRANCH into the build environment,
// so this script picks the right key based on branch and runs the real
// build (tsc -b && vite build) as a child process with that key explicitly
// set. It has to be done this way rather than writing a .env.local file:
// Vite gives already-set process.env values priority over .env files, so if
// the original flat VITE_CLERK_PUBLISHABLE_KEY variable is still configured
// in Cloudflare's build variables alongside the new _PROD/_PREVIEW ones, a
// file-based override would silently lose to it every time.
//
// Only acts when both *_PROD and *_PREVIEW are present (i.e. only inside a
// Workers Builds run) - a plain local `yarn build` (where neither is set)
// runs the build unmodified, unaffected by any of this.

import { spawnSync } from "node:child_process";

const PRODUCTION_BRANCH = "master";

const prodKey = process.env.VITE_CLERK_PUBLISHABLE_KEY_PROD;
const previewKey = process.env.VITE_CLERK_PUBLISHABLE_KEY_PREVIEW;

const env = { ...process.env };

if (prodKey && previewKey) {
  const branch = process.env.WORKERS_CI_BRANCH;
  const isProduction = branch === PRODUCTION_BRANCH;
  env.VITE_CLERK_PUBLISHABLE_KEY = isProduction ? prodKey : previewKey;
  console.log(
    `[select-clerk-key] branch="${branch ?? "(unset)"}" -> using ${
      isProduction ? "PROD" : "PREVIEW"
    } Clerk key.`
  );
} else {
  console.log(
    "[select-clerk-key] VITE_CLERK_PUBLISHABLE_KEY_PROD/_PREVIEW not both set, running build unmodified."
  );
}

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("npx", ["tsc", "-b"]);
run("npx", ["vite", "build"]);
