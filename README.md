# FlowLens

FlowLens is an open source workspace for turning Figma files and manual screenshots into searchable, shareable prototype flows.

## What this version includes

- Auth.js sign-in with local email fallback and optional Google, GitHub, and magic-link providers
- Protected app workspace under `/app`
- Figma integration settings with OAuth scaffolding and PAT fallback
- Figma file import with screenshot caching and page/section-based categorization
- Manual project mode with screenshot uploads and drawn hotspots
- Cards-first editor with filters, search, tags, share links, and a built-in player
- Local fallbacks for auth/data/storage so the app stays runnable without full production infra

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Auth.js
- Drizzle schema for Postgres
- Optional `pg-boss` queue integration
- Optional S3-compatible object storage

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

You can sign in immediately with the built-in local email flow. For production-style integrations, add environment variables for:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `FIGMA_CLIENT_ID`
- `FIGMA_CLIENT_SECRET`
- `FIGMA_OAUTH_REDIRECT_URI`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`
- `EMAIL_SERVER_HOST` / `EMAIL_SERVER_PORT` / `EMAIL_SERVER_USER` / `EMAIL_SERVER_PASSWORD` / `EMAIL_FROM`
- `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`

## Figma usage

1. Open Settings → Figma integration
2. Connect with OAuth or save a personal access token
3. Open Projects and import a Figma file URL
4. FlowLens fetches the file structure, caches screenshots, and groups screens by page and section

## Manual mode

1. Create a manual project
2. Upload screenshots inside the editor
3. Draw hotspots, define actions, and share the result with read-only links

## Database schema

Drizzle config is included for Postgres:

```bash
npm run db:generate
npm run db:push
```

The app currently ships with local persistence fallbacks so contributors can run it immediately, while still exposing the Postgres/Auth.js/S3/queue foundation needed for production deployment.
