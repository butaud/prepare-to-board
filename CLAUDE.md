# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prepare to Board** is a real-time collaborative board meeting planning app built with React + TypeScript. It uses Jazz Tools for peer-to-peer data sync (no traditional backend API) and Clerk for authentication.

## Commands

```bash
yarn dev        # Start dev server at http://localhost:5173
yarn build      # Type check + production build
yarn lint       # ESLint
yarn test       # Run Vitest suite
yarn preview    # Preview production build
```

Run a single test file:
```bash
yarn test src/test/meeting-view.test.tsx
```

## Architecture

### Provider Stack

```
ClerkProvider (auth)
  └─ JazzProvider (real-time sync via wss://cloud.jazz.tools)
     └─ BrowserRouter
        └─ App (routes)
```

### Data Layer (Jazz Tools)

All collaborative data is defined in `src/schema.ts` using Jazz's CoMap/CoList primitives. Key entities:

- **UserAccount** — root of user's data; holds organizations, selectedOrg, meetingShadows
- **Organization** — collaborative space with meetings list and member roles
- **Meeting** — has status lifecycle: `draft → published → live → completed`
- **Topic** — agenda item (title, duration, outcome) in a shared CoList
- **MeetingShadow** — user-local data (draft topics, notes) stored in UserAccount; enables async collaboration without polluting shared state
- **DraftTopic** — user's local topic before publishing to shared agenda

Jazz uses `useCoState` and `useAccount` hooks for reactive, auto-syncing data binding. No manual fetch/cache logic needed.

### Context & Hooks

Data flows through the tree via context:

- `LoadedAccountContext` — user account with resolved org/meeting relationships; set up in `src/ui/Header.tsx` via `useLoadAccount()` hook
- `MeetingContext` — current meeting; set up in `src/views/meeting/MeetingShared.tsx`
- `useLoadedAccount()` — consume account context (throws if not loaded)
- `useMeeting()` — consume meeting context (throws if not loaded)

### Permissions

Jazz Groups drive access control. Roles: `admin`, `writer` (officer), `reader` (member). Use `me.canWrite(entity)` and `me.canAdmin(org)` for checks — enforced at both UI and data layers.

### Draft Topic System

`src/util/data.ts` contains the publish/merge logic. Draft topics live in `MeetingShadow` (user-local) and are published to the shared `Meeting.topics` CoList. Drafts can specify an anchor topic for insertion position.

### Component Organization

- `src/views/` — page-level route components
- `src/views/meeting/` — meeting-specific pages (plan, present, minutes)
- `src/ui/` — reusable components (dialogs, forms, header)
- `src/hooks/` — data loading hooks
- `src/contexts/` — React context definitions
- `src/util/` — pure utility functions

## Environment Variables

Required in `.env`:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_JAZZ_API_KEY`

## Deployment

Deployed to Cloudflare via `wrangler.jsonc`. CI/CD via `.github/workflows/ci-cd.yml` — runs tests, then deploys to GitHub Pages on merge to master.
