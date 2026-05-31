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

Execute the test suite with [Vitest](https://vitest.dev/):

```bash
yarn test
```

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

