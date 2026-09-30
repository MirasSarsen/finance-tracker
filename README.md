# Personal Finance Tracker

A mobile-first personal finance tracker built with Next.js, TypeScript, PostgreSQL, and Drizzle ORM.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set a private `BETTER_AUTH_SECRET` value in `.env` (at least 32 characters).
4. Start PostgreSQL with `docker compose up -d`.
5. Apply migrations with `npm run db:migrate`.
6. Start the app with `npm run dev` and register a local user.
7. To add demo activity, use a new account with no transactions. In PowerShell, from the project folder, run:

   ```powershell
   $env:DEMO_USER_EMAIL = "your-registered-email@example.com"
   npm.cmd run db:seed
   ```

Run the financial calculation tests with `npm test` and check code style with `npm run lint`.

The local PostgreSQL credentials in `docker-compose.yml` are for development only. Keep `.env` out of version control.

## Database scripts

- `npm run db:generate` creates a migration from `db/schema.ts`.
- `npm run db:migrate` applies pending migrations.
- `npm run db:seed` adds 20 realistic transactions over the last three weeks for an existing, empty local account. It never seeds an account that already has transactions. Add `-- --dry-run` to preview the operation.
- `npm run db:studio` opens Drizzle Studio.

## Weekly analytics

- The balance is the sum of all income transactions minus all expense transactions.
- The current week starts on Monday in the `Asia/Qyzylorda` time zone. The previous-week comparison uses the same elapsed part of the previous week.
- Average daily spending is current-week expenses divided by the number of elapsed calendar days, with at least one day counted.
- “Safe to spend” is the non-negative current balance divided by the number of days left in the current week, including today. It does not account for bills or planned expenses.
- Daily totals, category totals, and insights use only the signed-in user's transactions. When there is no previous-week spending, the app omits the percentage change instead of dividing by zero.

## Weekly budget

Set or update the spending limit from the Analytics page. The app compares it with this week's expenses, shows the remaining amount (or overspend), and keeps a separate budget for each Monday-starting week in the `Asia/Qyzylorda` time zone.
