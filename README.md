# Prepare to Board

Prepare to Board is a web application for planning and running board meetings.
It is built with **React**, **TypeScript** and **Vite** and uses
[Clerk](https://clerk.com) for authentication and
[Convex](https://convex.dev) for the real-time data backend.

## Features

- Manage organizations and members with role‑based access
- Schedule meetings and build agendas
- Present topics and record meeting minutes
- Track upcoming meetings, personal action items and calendar events

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Yarn](https://yarnpkg.com/) package manager

### Installation

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Create a `.env` file in the project root and define the required environment
   variables:

   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_CONVEX_URL=https://your-deployment.convex.cloud
   ```

3. Configure Convex/Clerk auth:

   ```bash
   npx convex dev
   ```

   In the Convex dashboard, set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk
   issuer domain, for example `https://your-clerk-domain.clerk.accounts.dev`.

### Development

Run the development server:

```bash
yarn dev
```

The app is served at [http://localhost:5173](http://localhost:5173).

### Testing

Run the static test checks:

```bash
yarn test
```

Run browser-based end-to-end checks with [Playwright](https://playwright.dev/):

```bash
yarn test:e2e
```

Authenticated E2E checks use Clerk test users configured in `.env.e2e.local`.
Create three users in the same Clerk development/test instance used by `.env`:
admin, officer, and member. Each email address should include `+clerk_test`
before the `@`, for example `prepare-admin+clerk_test@example.com`. Clerk
recognizes that marker during email confirmation and accepts the fake
confirmation code `424242`, marking the user as a test account. Store the
credentials with these variable names:

```env
E2E_ADMIN_EMAIL=prepare-admin+clerk_test@example.com
E2E_ADMIN_PASSWORD=replace-me
E2E_OFFICER_EMAIL=prepare-officer+clerk_test@example.com
E2E_OFFICER_PASSWORD=replace-me
E2E_MEMBER_EMAIL=prepare-member+clerk_test@example.com
E2E_MEMBER_PASSWORD=replace-me
```

Playwright caches signed-in sessions in `.auth/*.json`. Delete those files or
run with `E2E_REFRESH_AUTH=true` after changing the test users or passwords.

For feature-oriented E2E and visual review, use the reviewer brief in
[`docs/agents/e2e-review-agent.md`](docs/agents/e2e-review-agent.md). It
describes how to turn a plain-English feature request into realistic browser
scenarios, screenshot review, findings, and residual risk.

### Linting

Check code style and static analysis rules:

```bash
yarn lint
```

### Production Build

Create an optimized production build and preview it locally:

```bash
yarn build
yarn preview
```

## Project Structure

```
src/                Application source code
public/             Static assets
index.html          HTML entry point
vite.config.ts      Vite configuration
```

## Contributing

Issues and pull requests are welcome. Please run the tests and lint before
submitting changes.

