# Client Desk

Single-user dashboard for leads, client projects, payments and daily to-dos — with a voice agent.

**Stack:** Next.js 15 (App Router) · Supabase Postgres + Storage · Vercel · AI SDK 7 with Gemini on Vertex AI.

## Run locally

```bash
npm install
vercel link            # once, pick the client-dashboard project
vercel env pull .env.local
npm run dev
```

## Database

Schema, views and RLS live in `supabase/schema.sql` (idempotent). Apply with `npm run db:migrate`.

## Deploy

Pushing to `main` deploys to production on Vercel. Other branches get preview URLs.
Secrets are stored in Vercel environment variables, never in this repo — see `.env.example` for the names.
