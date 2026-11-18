# Winter Arc 2026

A small two-person habit tracker built with Next.js, TypeScript, Tailwind CSS, and Supabase. H10 (“Journal and Photo Entry”) is a simple checkbox; this MVP does not store images or journal text.

## Set up Supabase

1. Create a Supabase project.
2. In the SQL editor, run [`supabase/migrations/202611180001_initial.sql`](supabase/migrations/202611180001_initial.sql).
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from the Supabase project settings.
4. Set `APP_PASSCODE` in `.env.local` to the digits or passphrase you want to use. Keep this variable server-only; do not prefix it with `NEXT_PUBLIC_`.
5. Install dependencies with `npm install`, then start the app with `npm run dev`.

For Vercel, add `APP_PASSCODE` in the project’s Environment Variables settings and redeploy. The home screen checks this value through a server route. A successful check unlocks the current browser tab until it is closed. This is a basic display gate only: Supabase remains directly accessible with its public publishable key and current database policies.

The MVP uses the public anon key and does not use authentication. Its database policies allow anyone with access to the application to read and edit both profiles. Profile view mode prevents accidental edits in the interface only; it is not access control. Do not use this setup for private or sensitive data without adding an authentication and authorization design.

## Scoring

The score calculation is centralized in `src/lib/domain/scoring.ts`. Daily entries snapshot the configured habit points on first save, so later changes to the habit configuration do not rewrite past scores. A day is perfect only when all ten configured habits are complete, and the 1.5 multiplier applies after all habit and general adjustments.
