# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prepare to Board** is a real-time board meeting planning app built with React + TypeScript. It uses Clerk for authentication and Convex for the data backend.

## Commands

```bash
yarn dev        # Start dev server at http://localhost:5173
yarn build      # Type check + production build
yarn lint       # ESLint
yarn test       # Run Vitest suite
yarn preview    # Preview production build
npx convex dev  # Generate Convex types and push backend functions
```

## Architecture

### Provider Stack

```
ClerkProvider (auth)
  └─ ConvexProviderWithClerk (real-time backend)
     └─ BrowserRouter
        └─ App (routes)
```

### Data Layer (Convex)

Convex schema and backend functions live under `convex/`.

- `convex/schema.ts` defines users, organizations, memberships, board members, and meetings.
- `convex/app.ts` contains the public queries and mutations used by the React app.
- `src/schema.ts` contains the client-side TypeScript shapes used by components.

The app reads data with `useQuery` and writes through explicit Convex mutations. Meeting agenda data is currently embedded on the meeting document as arrays of topics, live topics, minutes, and notes.

### Context & Hooks

Data flows through the tree via context:

- `LoadedAccountContext` — current user plus selected organization, loaded by `useLoadAccount()`
- `MeetingContext` — current meeting, loaded by `useLoadMeetingFromParams()`
- `useLoadedAccount()` — consume account context
- `useMeeting()` — consume meeting context

### Permissions

Convex `memberships` drive access control. Roles are `admin`, `writer` (officer), and `reader` (member). Server mutations enforce admin/officer checks, while client helpers expose `me.canWrite(entity)` and `me.canAdmin(entity)` for UI decisions.

### Component Organization

- `src/views/` — page-level route components
- `src/views/meeting/` — meeting-specific pages (plan, present, minutes)
- `src/ui/` — reusable components (dialogs, forms, header)
- `src/hooks/` — data loading hooks
- `src/util/` — pure utility functions

## Environment Variables

Required locally:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CONVEX_URL`

Required in Convex dashboard:

- `CLERK_JWT_ISSUER_DOMAIN`

## Deployment

Deployed to Cloudflare via `wrangler.jsonc`. CI/CD via `.github/workflows/ci-cd.yml` — runs tests, then deploys on merge to master.
