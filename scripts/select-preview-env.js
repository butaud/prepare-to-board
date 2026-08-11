// Cloudflare Workers Builds runs one build for every branch, using a single
// flat pool of "Build variables" (no separate preview/production values,
// unlike Cloudflare Pages). That caused two stacked problems for PR preview
// deploys (throwaway *.workers.dev subdomains):
//
// 1. VITE_CLERK_PUBLISHABLE_KEY was the production key, which is
//    domain-locked to the real production domain - Clerk rejected every
//    request from a preview origin outright.
// 2. Once that's fixed with a dev/test key, VITE_CONVEX_URL was still the
//    production Convex deployment, whose CLERK_JWT_ISSUER_DOMAIN only
//    trusts the production Clerk instance - so it rejects the (correctly
//    issued) dev-instance tokens a preview build now presents, and the
//    Convex WebSocket auth handshake fails in a reconnect loop instead.
//
// Workers Builds does inject WORKERS_CI_BRANCH into the build environment,
// so this script picks the right value for both variables based on branch
// and runs the real build (tsc -b && vite build) as a child process with
// them explicitly set. It has to be done this way rather than writing a
// .env.local file: Vite gives already-set process.env values priority over
// .env files, so if the original flat variables are still configured in
// Cloudflare's build variables too, a file-based override would silently
// lose to them every time.
//
// Each variable pair is handled independently and only overrides when both
// its _PROD and _PREVIEW counterparts are present (i.e. only inside a
// Workers Builds run) - a plain local `yarn build` (where none of these are
// set) runs the build unmodified.

import { spawnSync } from "node:child_process";

const PRODUCTION_BRANCH = "master";
const branch = process.env.WORKERS_CI_BRANCH;
const isProduction = branch === PRODUCTION_BRANCH;

const env = { ...process.env };
let overrodeAny = false;

const applyOverride = (varName) => {
  const prodValue = process.env[`${varName}_PROD`];
  const previewValue = process.env[`${varName}_PREVIEW`];
  if (!prodValue || !previewValue) return;

  env[varName] = isProduction ? prodValue : previewValue;
  overrodeAny = true;
  console.log(
    `[select-preview-env] ${varName}: branch="${branch ?? "(unset)"}" -> using ${
      isProduction ? "PROD" : "PREVIEW"
    } value.`
  );
};

applyOverride("VITE_CLERK_PUBLISHABLE_KEY");
applyOverride("VITE_CONVEX_URL");

if (!overrodeAny) {
  console.log(
    "[select-preview-env] No *_PROD/_PREVIEW pairs set, running build unmodified."
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
