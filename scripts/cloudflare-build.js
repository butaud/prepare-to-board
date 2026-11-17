// Build entry point for Cloudflare Workers Builds. The build command in the
// Cloudflare dashboard should be: node scripts/cloudflare-build.js
//
// Workers Builds runs one build for every branch with a single flat set of
// build variables. The build command used to run `npx convex deploy`
// directly with a production CONVEX_DEPLOY_KEY, so every PR branch's
// backend code was deployed to the production Convex deployment as soon as
// it was pushed, before review.
//
// Now:
// - master deploys to production, using CONVEX_DEPLOY_KEY_PROD (or the
//   older CONVEX_DEPLOY_KEY). It fails rather than run `convex deploy`
//   without a key, since the CLI would then fall back to whatever project
//   it's logged into.
// - Any other branch never uses the production key. With
//   CONVEX_DEPLOY_KEY_PREVIEW (a development deploy key) set, it deploys to
//   that dev deployment; without it, it skips the backend and only builds
//   the frontend.
//
// Convex's own --check-build-environment guard is disabled because it
// assumes Cloudflare's production branch is "main", so it would refuse this
// repo's master builds. The branch check here takes its place.

import { spawnSync } from "node:child_process";

const PRODUCTION_BRANCH = "master";
const branch = process.env.WORKERS_CI_BRANCH;
const isProduction = branch === PRODUCTION_BRANCH;
const label = `[cloudflare-build] branch="${branch ?? "(unset)"}"`;

const deployKey = isProduction
  ? process.env.CONVEX_DEPLOY_KEY_PROD || process.env.CONVEX_DEPLOY_KEY
  : process.env.CONVEX_DEPLOY_KEY_PREVIEW;

if (isProduction && !deployKey) {
  console.error(
    `${label}: no CONVEX_DEPLOY_KEY_PROD or CONVEX_DEPLOY_KEY set - refusing to deploy without an explicit production key.`
  );
  process.exit(1);
}
// Deploy keys are prefixed with their deployment type ("prod:", "dev:",
// "preview:").
if (!isProduction && deployKey?.startsWith("prod:")) {
  console.error(
    `${label}: CONVEX_DEPLOY_KEY_PREVIEW is a production deploy key - refusing to deploy a non-master branch to production.`
  );
  process.exit(1);
}

const env = { ...process.env };
delete env.CONVEX_DEPLOY_KEY;
delete env.CONVEX_DEPLOY_KEY_PROD;
delete env.CONVEX_DEPLOY_KEY_PREVIEW;

let command;
if (deployKey) {
  env.CONVEX_DEPLOY_KEY = deployKey;
  const target = isProduction ? "production" : "the dev deployment";
  console.log(`${label}: deploying the Convex backend to ${target}, then building.`);
  command =
    'npx convex deploy --check-build-environment disable --cmd "yarn build" --cmd-url-env-var-name VITE_CONVEX_URL';
} else {
  console.log(
    `${label}: no CONVEX_DEPLOY_KEY_PREVIEW set - skipping the Convex deploy and building the frontend only.`
  );
  command = "yarn build";
}

const result = spawnSync(command, { stdio: "inherit", env, shell: true });
process.exit(result.status ?? 1);
