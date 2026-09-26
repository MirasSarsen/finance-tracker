# Personal Finance Tracker

A mobile-first personal finance tracker built with Next.js, TypeScript, PostgreSQL, and Drizzle ORM.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set a private `BETTER_AUTH_SECRET` value in `.env` (at least 32 characters).
4. Start PostgreSQL with `docker compose up -d`.
5. Apply migrations with `npm run db:migrate`.
6. Start the app with `npm run dev`.

The local PostgreSQL credentials in `docker-compose.yml` are for development only. Keep `.env` out of version control.

## Database scripts

- `npm run db:generate` creates a migration from `db/schema.ts`.
- `npm run db:migrate` applies pending migrations.
- `npm run db:studio` opens Drizzle Studio.
